import { useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';

const AUTH_RETURN_URL_KEY = 'authReturnUrl';
const AUTH_ACTION_LABEL_KEY = 'authActionLabel';

/**
 * Action-time authentication gate.
 *
 * Instead of blocking entire routes, this hook lets the app gate individual
 * user actions (save schedule, post trade, post review, ...). When an
 * unauthenticated user triggers a guarded action:
 *  1. The current URL is stored so Auth0 can return the user to the exact page.
 *  2. A human-readable reason is stored so LoginPage can explain *why* the
 *     sign-in is needed.
 *  3. Auth0's redirect is invoked; on return the user lands back in context.
 */
export function useAuthGuard() {
  const { isAuthenticated, signIn } = useAuthContext();

  const requireAuth = useCallback(
    async (action: () => void | Promise<void>, ctxLabel: string): Promise<boolean> => {
      if (isAuthenticated) {
        await action();
        return true;
      }

      // Store the return URL and reason before redirecting.
      window.sessionStorage.setItem(
        AUTH_RETURN_URL_KEY,
        window.location.pathname + window.location.search,
      );
      window.sessionStorage.setItem(AUTH_ACTION_LABEL_KEY, ctxLabel);
      await signIn();
      return false;
    },
    [isAuthenticated, signIn],
  );

  return { requireAuth, isAuthenticated };
}

export function consumeAuthReturnContext(): {
  returnUrl: string | null;
  actionLabel: string | null;
} {
  const returnUrl = window.sessionStorage.getItem(AUTH_RETURN_URL_KEY);
  const actionLabel = window.sessionStorage.getItem(AUTH_ACTION_LABEL_KEY);
  window.sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
  window.sessionStorage.removeItem(AUTH_ACTION_LABEL_KEY);
  return { returnUrl, actionLabel };
}
