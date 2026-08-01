import { useAuth0 } from '@auth0/auth0-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '../services/apiClient';
import type { UserProfile } from '../types';

interface AuthContextValue {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  getToken: () => Promise<string>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    isAuthenticated,
    isLoading: authLoading,
    user: auth0User,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const appUser = useMemo(
    () =>
      auth0User?.sub
        ? {
            id: auth0User.sub,
            email: auth0User.email || '',
            displayName: auth0User.name || auth0User.email || '',
            avatarUrl: auth0User.picture || undefined,
          }
        : null,
    [auth0User],
  );

  const getToken = useCallback(() => getAccessTokenSilently(), [getAccessTokenSilently]);

  const signIn = useCallback(() => loginWithRedirect(), [loginWithRedirect]);

  const signOut = useCallback(
    () => logout({ logoutParams: { returnTo: window.location.origin } }),
    [logout],
  );

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);
    try {
      const token = await getToken();
      const result = await api.get<{ profile: UserProfile }>('/user-profile', token);
      setProfile(result.profile);
    } catch (error) {
      // 404 is expected for a brand-new user with no profile row yet.
      if (!(error instanceof ApiError && error.status === 404)) {
        console.error('[AuthContext] Failed to refresh profile:', error);
      }
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [isAuthenticated, getToken]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!isAuthenticated) {
        throw new Error('Cannot update profile: not authenticated');
      }

      const token = await getToken();
      const result = await api.post<{ profile: UserProfile }>('/user-profile', updates, token);
      setProfile(result.profile);
    },
    [isAuthenticated, getToken],
  );

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [isAuthenticated, authLoading, refreshProfile]);

  const value = useMemo(
    () => ({
      user: appUser,
      profile,
      loading: authLoading || profileLoading,
      isAuthenticated,
      signIn,
      signOut,
      getToken,
      refreshProfile,
      updateProfile,
    }),
    [
      appUser,
      profile,
      authLoading,
      profileLoading,
      isAuthenticated,
      signIn,
      signOut,
      getToken,
      refreshProfile,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
