/**
 * Capacitor availability detection.
 *
 * All native features go through this module so the web build keeps working
 * unchanged: when the app runs in a browser, `isNativePlatform()` is false and
 * every helper becomes a harmless no-op (or gracefully degrades to web
 * behaviour such as the Web Share API or clipboard).
 */
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroid(): boolean {
  return isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isIOS(): boolean {
  return isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export function getAppUrl(): string {
  // On the web, deep links fall back to the deployed site URL.
  if (isNativePlatform()) {
    return `${Capacitor.getPlatform()}://${window.location.host}`;
  }
  return window.location.origin;
}
