/**
 * Web Vibration API wrappers.
 * Safely triggers subtle vibration feedback on supporting mobile web browsers.
 */

export async function hapticSuccess(): Promise<void> {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(20);
    } catch {
      // Ignore vibration errors
    }
  }
}

export async function hapticError(): Promise<void> {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([40, 40, 40]);
    } catch {
      // Ignore vibration errors
    }
  }
}

export async function hapticLight(): Promise<void> {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(10);
    } catch {
      // Ignore vibration errors
    }
  }
}
