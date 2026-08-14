import { useAuth0 } from '@auth0/auth0-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiError, api } from '../services/apiClient';
import type { UserProfile } from '../types';

/**
 * Auth0 caches tokens (including the refresh token, since `useRefreshTokens`
 * is enabled) in localStorage under a known prefix. When a refresh token has
 * been rotated, revoked, or expired server-side, the SDK keeps reusing the
 * stale copy and every silent refresh fails with "Unknown or invalid refresh
 * token". Clearing the cache forces the SDK to forget it.
 */
const AUTH0_CACHE_PREFIX = '@@auth0spajs@@';

function clearAuth0Cache(): void {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(AUTH0_CACHE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => {
    window.localStorage.removeItem(key);
  });
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('unknown or invalid refresh token');
}

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
  signIn: (returnUrl?: string) => Promise<void>;
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
  const fetchInFlight = useRef<symbol | null>(null);

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
      // A dead refresh token is unrecoverable client-side: clear the stale
      // Auth0 cache and send the user through a fresh login instead of
      // retrying silently forever.
      if (isInvalidRefreshTokenError(error)) {
        clearAuth0Cache();
        await loginWithRedirect({
          appState: { returnTo: window.location.pathname + window.location.search },
        });
      }
      throw error;
    }
  }, [getAccessTokenSilently, loginWithRedirect]);

  const signIn = useCallback(
    (returnUrl?: string) =>
      loginWithRedirect({
        ...(returnUrl ? { appState: { returnTo: returnUrl } } : {}),
      }),
    [loginWithRedirect],
  );

  const signOut = useCallback(
    () => logout({ logoutParams: { returnTo: window.location.origin } }),
    [logout],
  );

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }

    // Guard against overlapping calls: the last caller wins
    const ticket = Symbol();
    fetchInFlight.current = ticket;

    setProfileLoading(true);
    try {
      const token = await getToken();
      const result = await api.get<{ profile: UserProfile }>('/user-profile', token);
      // Only apply if this is still the latest call
      if (fetchInFlight.current === ticket) {
        setProfile(result.profile);
      }
    } catch (error) {
      if (fetchInFlight.current !== ticket) return;
      // 404 is expected for a brand-new user with no profile row yet.
      if (!(error instanceof ApiError && error.status === 404)) {
        console.error('[AuthContext] Failed to refresh profile:', error);
      }
      setProfile(null);
    } finally {
      if (fetchInFlight.current === ticket) {
        setProfileLoading(false);
        fetchInFlight.current = null;
      }
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
