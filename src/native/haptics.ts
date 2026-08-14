/**
 * Haptics and other native behaviour polish.
 *
 * - Haptics: success / error / selection feedback for trade actions and
 *   schedule generation (web path is silent).
 * - Icon badge: shows the count of open trade responses (Android/iOS via
 *   @capawesome/capacitor-badge; cleared on app foregrounding).
 * - Status bar: keeps the app-coloured bar consistent after navigation.
 */
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Badge } from '@capawesome/capacitor-badge';
import { isIOS, isNativePlatform } from './capacitor';

export async function hapticSuccess(): Promise<void> {
  if (!isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticError(): Promise<void> {
  if (!isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Heavy });
}

export async function hapticLight(): Promise<void> {
  if (!isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function setBadgeCount(count: number): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    if (count <= 0) {
      await Badge.clear();
    } else {
      await Badge.set({ count: Math.min(count, 99) });
    }
  } catch (error) {
    console.error('[Badge] Failed to update badge count:', error);
  }
}

/**
 * Call this whenever the trade list changes (e.g., new open responses) so the
 * home-screen icon reflects pending trade activity.
 */
export async function syncBadgeWithOpenTrades(openTradeCount: number): Promise<void> {
  await setBadgeCount(openTradeCount);
}

/**
 * Configure the status bar for the app's theme. Called once on app start.
 */
export async function configureStatusBar(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (isIOS()) {
      // iOS allows a tinted background; keep it consistent with the brand.
      await StatusBar.setBackgroundColor({ color: '#0061a4' });
    }
  } catch (error) {
    console.error('[StatusBar] Configuration failed:', error);
  }
}
