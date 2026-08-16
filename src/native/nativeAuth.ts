/**
 * Native Auth0 callback handling.
 *
 * When the user finishes signing in via the system browser, Auth0 redirects
 * to the custom scheme URL
 *
 *   auraishub://{domain}/capacitor/app.aurais/callback?code=...&state=...
 *
 * and Android hands that URL back to the app through an `appUrlOpen` event
 * (both cold-start and while running). This hook listens for those events,
 * recognises the callback, and feeds the URL into the Auth0 SDK's
 * `handleRedirectCallback` so the authorization code gets exchanged for
 * tokens and `isAuthenticated` / `user` flip to their signed-in values.
 *
 * On the web this is a no-op: the SDK's own redirect handling (cacheLocation
 * = localstorage, `/callback` route) completes the flow there.
 */
import { useAuth0 } from '@auth0/auth0-react';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useCallback, useEffect, useRef } from 'react';
import { APP_ID } from './auth';
import { isNativePlatform } from './capacitor';

const AUTH0_DOMAIN_PLACEHOLDER = import.meta.env.VITE_AUTH0_DOMAIN || '';

function isAuthCallback(url: string): boolean {
  const expected = `auraishub://${AUTH0_DOMAIN_PLACEHOLDER}/capacitor/${APP_ID}/callback`;
  if (!url.startsWith(expected)) return false;
  try {
    const params = new URL(url.replace('auraishub://', 'https://capacitor.local')).searchParams;
    return params.has('state') && (params.has('code') || params.has('error'));
  } catch {
    return false;
  }
}

export function useNativeAuth() {
  const { handleRedirectCallback } = useAuth0();
  const processedRef = useRef<Set<string>>(new Set());

  const handleUrl = useCallback(
    async (url: string) => {
      if (!isAuthCallback(url)) return;

      // Same cold-start URL can fire both at launch and again after the
      // browser closes; guard against processing it twice.
      if (processedRef.current.has(url)) return;
      processedRef.current.add(url);

      try {
        await handleRedirectCallback(url);
      } catch (error) {
        // The SDK re-throws when the state can't be matched (e.g. a stale
        // callback from a previous login attempt). Clear the cached copy so
        // the next login starts fresh instead of failing on startup forever.
        console.error('[useNativeAuth] handleRedirectCallback failed:', error);
        processedRef.current.delete(url);
      } finally {
        void Browser.close();
      }
    },
    [handleRedirectCallback],
  );

  useEffect(() => {
    if (!isNativePlatform()) return;

    // Callback arriving while the app is already running.
    let removeUrlOpen: () => void;
    void CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      void handleUrl(event.url);
    }).then((handle) => {
      removeUrlOpen = () => handle.remove();
    });

    // Callback that launched the app from a cold start.
    void CapacitorApp.getLaunchUrl().then((result) => {
      if (result?.url) void handleUrl(result.url);
    });

    return () => {
      removeUrlOpen?.();
    };
  }, [handleUrl]);

  // NOTE: `getNativeAuthRedirectUri()` must be registered in the Auth0
  // dashboard (Allowed Callback URLs / Allowed Logout URLs) for the native
  // flow to be accepted by the Auth0 service.
}
