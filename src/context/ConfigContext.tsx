import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePreferenceSync } from '../hooks/usePreferenceSync';
import type { Preferences } from '../types';
import { DEFAULT_PREFERENCES, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { useAuthContext } from './AuthContext';

interface ConfigContextValue {
  preferences: Preferences;
  updatePreferences: (updates: Partial<Preferences>) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated, updateProfile } = useAuthContext();

  const [preferences, setPreferences] = useState<Preferences>(() =>
    storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES),
  );

  // Once the cloud profile is available, merge it with any locally tuned
  // preferences (post-login sync). See `usePreferenceSync` for the merge rules.
  usePreferenceSync();

  useEffect(() => {
    if (!profile?.preferences) return;
    setPreferences((prev) => {
      const local = storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
      const isDirty = storage.get(STORAGE_KEYS.PREFS_DIRTY, false);
      // While sync runs (dirty flag set), keep locally tuned prefs; only
      // overwrite with cloud prefs when local state has not been modified.
      if (isDirty) return prev;
      if (JSON.stringify(local) !== JSON.stringify(profile.preferences)) {
        return profile.preferences as Preferences;
      }
      return prev;
    });
  }, [profile]);

  const updatePreferences = useCallback(
    (updates: Partial<Preferences>) => {
      setPreferences((prev) => {
        const merged = { ...prev, ...updates };
        storage.set(STORAGE_KEYS.PREFERENCES, merged);
        if (isAuthenticated) {
          updateProfile({ preferences: merged }).catch(console.error);
        }
        return merged;
      });
    },
    [isAuthenticated, updateProfile],
  );

  return (
    <ConfigContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfigContext() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfigContext must be used within a ConfigProvider');
  return ctx;
}
