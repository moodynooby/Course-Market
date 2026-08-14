/**
 * Push notifications (native only).
 *
 * Responsibilities:
 * 1. Register the device with FCM/APNs and persist the device token in the
 *    user profile via the existing /user-profile API (backend stores it in
 *    user_profiles.push_notification_token).
 * 2. Show a local notification when a push arrives while the app is open,
 *    and route tap events into the app (deep-link handling lives in
 *    native/deepLinks.ts).
 * 3. Ask permission lazily — only after the user has signed in, and re-prompt
 *    after a trade action if they have declined.
 *
 * Everything here no-ops on the web.
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { api } from '../services/apiClient';
import { isNativePlatform } from './capacitor';

const TOKEN_STORAGE_KEY = 'aurais:pushToken';

async function registerWithBackend(authToken: string, registration: Token): Promise<void> {
  try {
    await api.post('/user-profile', { pushNotificationToken: registration.value }, authToken);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, registration.value);
  } catch (error) {
    // Never block the app on push registration failures.
    console.error('[PushNotifications] Failed to register token with backend:', error);
  }
}

/**
 * Requests native push permission and registers the device. Returns the
 * received token, or null when not on a native platform or when registration
 * failed.
 */
export async function registerPushNotifications(_authToken?: string): Promise<string | null> {
  if (!isNativePlatform()) return null;

  try {
    const permissions = await PushNotifications.requestPermissions();
    if (permissions.receive !== 'granted') return null;

    await PushNotifications.register();
    // The actual token arrives via the 'registration' event; we resolve it
    // from storage (set by the listener registered in usePushNotifications).
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('[PushNotifications] Registration failed:', error);
    return null;
  }
}

/**
 * React hook that wires up the Capacitor push event listeners. Must be
 * mounted once at app level (inside AuthProvider so we have the auth token).
 */
export function usePushNotifications({ getToken }: { getToken: () => Promise<string> }) {
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isNativePlatform()) return;

    // Token received from FCM / APNs -> send to the backend. In Capacitor 8,
    // addListener returns Promise<PluginListenerHandle>, so we keep the
    // resolved remove functions for cleanup.
    let removeRegistration: () => void;
    void PushNotifications.addListener('registration', async (token) => {
      try {
        const authToken = await getTokenRef.current();
        await registerWithBackend(authToken, token);
      } catch {
        // Logged inside registerWithBackend; keep the listener alive.
      }
    }).then((handle) => {
      removeRegistration = () => handle.remove();
    });

    let removeRegistrationError: () => void;
    void PushNotifications.addListener('registrationError', (error) => {
      console.error('[PushNotifications] Registration error:', error);
    }).then((handle) => {
      removeRegistrationError = () => handle.remove();
    });

    // Payload shape sent from the backend push helper:
    // { title, body, tradeId?, path? }. When the app is in the foreground we
    // show the notification locally via the LocalNotifications plugin.
    void PushNotifications.addListener('pushNotificationReceived', (notification) => {
      void LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % Number.MAX_SAFE_INTEGER,
            title: notification.title || 'AuraIsHub',
            body: notification.body || '',
            sound: 'default',
            extra: notification.data ?? {},
          },
        ],
      });
    });

    return () => {
      removeRegistration?.();
      removeRegistrationError?.();
      PushNotifications.removeAllListeners();
    };
  }, []);

  const unregister = useCallback(async () => {
    if (!isNativePlatform()) return;
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    await PushNotifications.unregister();
  }, []);

  return { unregister };
}
