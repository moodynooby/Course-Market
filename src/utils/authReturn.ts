/**
 * Storage helpers for preserving the return URL across OAuth authentication redirects.
 */

const AUTH_RETURN_URL_KEY = 'authReturnUrl';

export function setAuthReturnContext(returnUrl: string): void {
  try {
    window.sessionStorage.setItem(AUTH_RETURN_URL_KEY, returnUrl);
  } catch {
    // SessionStorage may be restricted in private browsing
  }
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
  } catch {
    // Ignore cleanup errors
  }
  return context;
}
