import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'github' | 'phone';
  phoneNumber?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePhoneNumber: (phone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  signInWithGoogle: async () => {},
  signInWithGithub: async () => {},
  signInWithPhone: async () => {},
  signOut: async () => {},
  updatePhoneNumber: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const saved = localStorage.getItem('app-user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const mockUser: AppUser = {
        uid: 'google-' + Date.now(),
        email: 'user@gmail.com',
        displayName: 'Google User',
        photoURL: null,
        provider: 'google',
      };
      setUser(mockUser);
      localStorage.setItem('app-user', JSON.stringify(mockUser));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGithub = async () => {
    setLoading(true);
    try {
      const mockUser: AppUser = {
        uid: 'github-' + Date.now(),
        email: 'user@github.com',
        displayName: 'GitHub User',
        photoURL: null,
        provider: 'github',
      };
      setUser(mockUser);
      localStorage.setItem('app-user', JSON.stringify(mockUser));
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhone = async (phoneNumber: string) => {
    setLoading(true);
    try {
      const mockUser: AppUser = {
        uid: 'phone-' + Date.now(),
        email: null,
        displayName: 'Phone User',
        photoURL: null,
        provider: 'phone',
        phoneNumber,
      };
      setUser(mockUser);
      localStorage.setItem('app-user', JSON.stringify(mockUser));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('app-user');
  };

  const updatePhoneNumber = async (phone: string) => {
    if (user) {
      const updated = { ...user, phoneNumber: phone };
      setUser(updated);
      localStorage.setItem('app-user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error: null,
        signInWithGoogle,
        signInWithGithub,
        signInWithPhone,
        signOut,
        updatePhoneNumber,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}