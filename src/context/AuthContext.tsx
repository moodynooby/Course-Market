import { useAuth0 } from '@auth0/auth0-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../services/apiClient';
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
  const [loading, setLoading] = useState(true);

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

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  }, [getAccessTokenSilently]);

  const signIn = useCallback(async () => {
    await loginWithRedirect();
  }, [loginWithRedirect]);

  const signOut = useCallback(
    () =>
      logout({
        logoutParams: { returnTo: window.location.origin },
      }),
    [logout],
  );

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      const result = await api.get<{ profile: UserProfile }>('/user-profile', token);
      setProfile(result.profile);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setProfile(null);
      } else {
        console.error('[AuthContext] Failed to refresh profile:', error);
        setProfile(null);
      }
    } finally {
      setLoading(false);
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
    if (!isAuthenticated || authLoading) {
      return;
    }

    refreshProfile();
  }, [isAuthenticated, authLoading, refreshProfile]);

  // Set loading to false when not authenticated
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const value = useMemo(
    () => ({
      user: appUser,
      profile,
      loading,
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
      loading,
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
