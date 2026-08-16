/**
 * One-hook native app bootstrap.
 *
 * Mount this inside the App component (after AuthProvider) so the native
 * shell is configured, deep links are wired, and push notifications are
 * registered once the user is authenticated. On the web this is a no-op.
 */

import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { useEffect, useRef } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { isNativePlatform } from './capacitor';
import { useDeepLinks } from './deepLinks';
import { configureStatusBar, syncBadgeWithOpenTrades } from './haptics';
import { useNativeAuth } from './nativeAuth';
import { registerPushNotifications, usePushNotifications } from './pushNotifications';

export function useNativeApp() {
  useDeepLinks();
  useNativeAuth();
  const { isAuthenticated, getToken, profile } = useAuthContext();
  const { unregister } = usePushNotifications({ getToken });
  const registeredRef = useRef(false);

  // Native bootstrap: status bar styling and hiding the splash screen once
  // React has painted. On web, SplashScreen calls are no-ops but we still
  // guard for clarity.
  useEffect(() => {
    if (!isNativePlatform()) return;

    void configureStatusBar();

    // The splash screen hides when the UI is ready; give the first paint a
    // moment so users never see a flash of unstyled content.
    const hideSplash = window.setTimeout(() => {
      void SplashScreen.hide({ fadeOutDuration: 300 });
    }, 800);

    return () => {
      window.clearTimeout(hideSplash);
      void unregister();
    };
  }, [unregister]);

  // Register for push notifications after a successful sign-in. We request
  // permission lazily (only on native) and only once per app install.
  useEffect(() => {
    if (!isNativePlatform() || !isAuthenticated || registeredRef.current) return;
    registeredRef.current = true;
    void registerPushNotifications()
      .then((token) => (token ? undefined : undefined))
      .catch(() => {
        /* registration errors are already logged inside the module */
      });
  }, [isAuthenticated]);

  // Keep the icon badge in sync with open trades while authenticated.
  useEffect(() => {
    if (!isNativePlatform() || !isAuthenticated) return;
    // Open responses relevant to the user: trades where the user is the
    // *recipient* of an update are surfaced elsewhere; here we keep the
    // badge proportional to the user's own open trade posts as a simple
    // activity signal. (Server-driven badge counts are a follow-up.)
    const openCount = profile?.courseSelections ? Object.keys(profile.courseSelections).length : 0;
    void syncBadgeWithOpenTrades(openCount);
  }, [isAuthenticated, profile]);

  // Clear the badge when the app returns to the foreground so stale counts
  // don't linger.
  useEffect(() => {
    if (!isNativePlatform()) return;
    // CapacitorApp.addListener returns a Promise<PluginListenerHandle>, so we
    // await the handle before exposing it to the cleanup function.
    let removeListener: () => void;
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void syncBadgeWithOpenTrades(0);
    }).then((handle) => {
      removeListener = () => handle.remove();
    });
    return () => {
      removeListener?.();
    };
  }, []);
}
