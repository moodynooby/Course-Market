import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useMemo } from 'react';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export function useAuth() {
  const {
    isAuthenticated,
    isLoading,
    user: auth0User,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const user: AppUser | null = useMemo(
    () =>
      auth0User
        ? {
            id: auth0User.sub!,
            email: auth0User.email!,
            displayName: auth0User.name || auth0User.email!,
            avatarUrl: auth0User.picture,
          }
        : null,
    [auth0User],
  );

  const signIn = useCallback(() => loginWithRedirect(), [loginWithRedirect]);

  const signOut = useCallback(
    () =>
      logout({
        logoutParams: { returnTo: window.location.origin },
      }),
    [logout],
  );

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  }, [getAccessTokenSilently]);

  return {
    user,
    loading: isLoading,
    isAuthenticated,
    signIn,
    signOut,
    getToken,
  };
}
