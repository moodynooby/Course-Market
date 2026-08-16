/**
 * Native (Capacitor) OAuth bridge for Auth0.
 *
 * The Auth0 React SDK (`loginWithRedirect`) is built for the web: it navigates
 * to the login page with `window.location.href`. Inside a Capacitor WebView
 * that breaks — the universal-login redirect often ends up in a blank WebView
 * page and the app never sees the authentication callback.
 *
 * This module implements the flow Auth0 officially recommends for Capacitor:
 *  1. Open the authorization URL in the system browser (Chrome Custom Tabs)
 *     via `Browser.open({ windowName: "_self" })`, which keeps the session
 *     cookies intact and survives the redirect back.
 *  2. Route the callback through a custom URL scheme registered in the
 *     Android manifest, so the OS hands the URL back to this app.
 *  3. Hand the URL (containing `code` + `state`) to
 *     `handleRedirectCallback()` so the SDK exchanges the code for tokens
 *     and updates `isAuthenticated` / `user`.
 *
 * On the web this module is a no-op — the standard SPA redirect flow keeps
 * working unchanged.
 */
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { env } from '../utils/env';
import { isAndroid, isNativePlatform } from './capacitor';

const APP_ID = 'app.aurais';

/**
 * The redirect URI Auth0 should send the user back to on native.
 *
 *   auraishub://{auth0Domain}/capacitor/app.aurais/callback
 *
 * `auraishub` is the app's registered URL scheme (capacitor.config.ts
 * appUrlScheme), so Android routes links with this scheme straight back into
 * this app. The path mirrors the official Auth0 Capacitor convention
 * (`{appId}://{domain}/capacitor/{appId}/callback`) so the listener below can
 * reliably recognise it.
 */
export function getNativeAuthRedirectUri(): string {
  return `auraishub://${env.AUTH0_DOMAIN}/capacitor/${APP_ID}/callback`;
}

/** True when a URL looks like an Auth0 authorization callback on the native scheme. */
function isAuthCallback(url: string): boolean {
  if (!url.startsWith(`auraishub://${env.AUTH0_DOMAIN}/capacitor/${APP_ID}`)) {
    return false;
  }
  const params = new URL(url.replace('auraishub://', 'https://capacitor.local')).searchParams;
  return params.has('state') && (params.has('code') || params.has('error'));
}

/**
 * Open the given authorization URL in the device system browser and, once the
 * user finishes the flow, route the incoming callback URL back into the app.
 *
 * @returns a promise that resolves when the system browser has been opened
 * (and the cleanup listener has been attached); the promise may reject if the
 * browser cannot be opened, in which case the caller can fall back.
 */
export async function openAuthUrlInSystemBrowser(url: string): Promise<void> {
  if (!isNativePlatform()) {
    // On the web, do nothing and let the SDK navigate normally.
    return;
  }

  let removeListener: () => void;

  // Close the system browser as soon as the app receives the callback.
  void CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    if (isAuthCallback(event.url)) {
      void Browser.close();
    }
  }).then((handle) => {
    removeListener = () => handle.remove();
  });

  await Browser.open({ url, windowName: '_self' });

  // Guard: if the user abandons the flow and the browser is closed manually
  // (e.g. back button), drop the listener after a generous window.
  window.setTimeout(() => {
    removeListener?.();
  }, 10 * 60 * 1000);
}

/**
 * Build the `openUrl` handler the Auth0 SDK accepts. On native it uses the
 * system browser; on the web it falls back to the default navigation.
 */
export function buildNativeOpenUrlHandler(): ((url: string) => void | Promise<void>) | undefined {
  if (!isNativePlatform()) return undefined;
  return async (url: string) => {
    await openAuthUrlInSystemBrowser(url);
  };
}

/**
 * Whether this build runs inside the native Capacitor shell.
 *
 * Extracted here (rather than calling `isNativePlatform()` everywhere) so
 * tests and other modules have a single point of reference for native-only
 * behaviour.
 */
export { isNativePlatform, isAndroid, APP_ID };
