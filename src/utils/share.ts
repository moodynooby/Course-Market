/**
 * Web-standard sharing and deep-link generation.
 *
 * Uses the Web Share API (navigator.share) when available (supported on mobile
 * Chrome/Safari) and falls back to copying to the clipboard.
 */

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  /** base64 data URL produced by canvas.toDataURL() */
  imageDataUrl?: string;
}

/**
 * Build a shareable link for a trade / course / professor.
 */
export function buildDeepLink(params: {
  tradeId?: number | string;
  courseCode?: string;
  professorId?: string | number;
}): string {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin;
  if (params.tradeId !== undefined) {
    return `${base}/trading?tradeId=${encodeURIComponent(String(params.tradeId))}`;
  }
  if (params.courseCode) {
    return `${base}/courses?code=${encodeURIComponent(params.courseCode)}`;
  }
  if (params.professorId !== undefined) {
    return `${base}/professors/${params.professorId}`;
  }
  return base;
}

/**
 * Share content using standard Web APIs.
 */
export async function shareContent(payload: SharePayload): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.canShare !== undefined) {
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
    } catch {}
  }

  try {
    const value = payload.url || payload.text || '';
    if (value && typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(value);
    }
    return Boolean(value);
  } catch {
    return false;
  }
}
