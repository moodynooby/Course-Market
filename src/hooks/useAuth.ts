import { useAuth0 } from '@auth0/auth0-react';

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

  const user: AppUser | null = auth0User
    ? {
        id: auth0User.sub!,
        email: auth0User.email!,
        displayName: auth0User.name || auth0User.email!,
        avatarUrl: auth0User.picture,
      }
    : null;

  const signIn = () => loginWithRedirect();

  const signOut = () =>
    logout({
      logoutParams: { returnTo: window.location.origin },
    });

  const getToken = async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  };

  return {
    user,
    loading: isLoading,
    isAuthenticated,
    signIn,
    signOut,
    getToken,
  };
}
