/**
 * Native sharing.
 *
 * - On the native app: uses the Capacitor Share plugin, which opens the OS
 *   share sheet (WhatsApp, Instagram DMs, email, ...). Images generated with
 *   html2canvas are handed off as base64 data so the share sheet shows a
 *   real preview.
 * - On the web: falls back to the Web Share API (mobile browsers support
 *   sharing images too) and then to clipboard copy.
 */
import { Share } from '@capacitor/share';
import { isNativePlatform } from './capacitor';

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  /** base64 data URL produced by html2canvas.toDataURL() */
  imageDataUrl?: string;
}

export async function shareContent(payload: SharePayload): Promise<boolean> {
  // Native app path — guaranteed share sheet, supports image previews.
  if (isNativePlatform()) {
    try {
      const shareOptions: {
        title?: string;
        text?: string;
        url?: string;
        dialogTitle?: string;
      } & Record<string, unknown> = {
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.title ?? 'Share',
      };
      if (payload.imageDataUrl) {
        // Capacitor Share expects a plain data URL; strip any extra headers.
        shareOptions.dataUrl = payload.imageDataUrl;
      }
      await Share.share(shareOptions);
      return true;
    } catch {
      return false;
    }
  }

  // Web path — Web Share API (supports images on Chrome Android).
  if (navigator.canShare !== undefined) {
    try {
      const files: File[] = [];
      if (payload.imageDataUrl) {
        const blob = await fetch(payload.imageDataUrl).then((r) => r.blob());
        files.push(new File([blob], 'my-timetable.png', { type: 'image/png' }));
      }
      if (
        navigator.canShare({
          text: payload.text,
          url: payload.url,
          files: files.length ? files : undefined,
        })
      ) {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
          files: files.length ? files : undefined,
        });
        return true;
      }
    } catch {
      // User cancelled or share not supported — fall through to clipboard.
    }
  }

  // Last resort: copy the link to the clipboard.
  try {
    const value = payload.url || payload.text || '';
    if (value) {
      await navigator.clipboard.writeText(value);
    }
    return Boolean(value);
  } catch {
    return false;
  }
}
