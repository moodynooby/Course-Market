/**
 * Storage helpers for preserving the return URL across OAuth authentication redirects.
 */

const AUTH_RETURN_URL_KEY = 'authReturnUrl';

export type AuthReturnState = {
  from?: string | { pathname: string; search?: string };
};

/** Returns the normalized return target from a router `state.from` value. */
export function resolveStateFrom(state: AuthReturnState | undefined): string | null {
  if (typeof state?.from === 'string') return state.from;
  if (state?.from?.pathname) return `${state.from.pathname}${state.from.search || ''}`;
  return null;
}

/** Returns `/` for absolute or protocol-relative URLs so redirects stay on this origin. */
export function toSafeRelativeUrl(candidate: string | null | undefined): string {
  return candidate?.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
}

export function setAuthReturnContext(returnUrl: string): void {
  try {
    window.sessionStorage.setItem(AUTH_RETURN_URL_KEY, returnUrl);
  } catch {}
}

export function getAuthReturnContext(): { returnUrl: string | null } {
  try {
    const returnUrl = window.sessionStorage.getItem(AUTH_RETURN_URL_KEY);
    return { returnUrl };
  } catch {
    return { returnUrl: null };
  }
}

export function consumeAuthReturnContext(): { returnUrl: string | null } {
  const context = getAuthReturnContext();
  try {
    window.sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
  } catch {}
  return context;
}
