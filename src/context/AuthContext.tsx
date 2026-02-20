import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { STORAGE_KEYS } from '../config/userConfig';

// Types
export interface AppUser {
  uid: string;
  displayName: string;
  phoneNumber: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (displayName: string, phoneNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APP_USER);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const login = async (displayName: string, phoneNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const user: AppUser = {
        uid: 'user-' + Date.now(),
        displayName,
        phoneNumber,
      };
      setUser(user);
      localStorage.setItem(STORAGE_KEYS.APP_USER, JSON.stringify(user));
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.APP_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
