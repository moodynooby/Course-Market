import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAutoPersistence } from '../hooks/useAutoPersistence';
import { usePreferenceSync } from '../hooks/usePreferenceSync';
import type { Preferences } from '../types';
import { DEFAULT_PREFERENCES, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { useAuthContext } from './AuthContext';

interface ConfigContextValue {
  preferences: Preferences;
  updatePreferences: (updates: Partial<Preferences>, options?: { skipCloudSync?: boolean }) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated, updateProfile } = useAuthContext();

  const [preferences, setPreferences] = useState<Preferences>(() =>
    storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES),
  );

  const persistence = useAutoPersistence<Preferences>({
    persistLocal: (prefs) => storage.set(STORAGE_KEYS.PREFERENCES, prefs),
    debounceMs: 300,
    onSave: async (prefs) => {
      if (!isAuthenticated) return;
      await updateProfile({ preferences: prefs });
    },
    onError: (err) => {
      console.error('[ConfigContext] Failed to save preferences:', err);
    },
  });

  useEffect(() => {
    if (!profile?.preferences) return;
    const cloudPrefs = profile.preferences as Preferences;
    const local = storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
    const isDirty = storage.get(STORAGE_KEYS.PREFS_DIRTY, false);
    if (isDirty) return;

    if (JSON.stringify(local) !== JSON.stringify(cloudPrefs)) {
      setPreferences(cloudPrefs);
      storage.set(STORAGE_KEYS.PREFERENCES, cloudPrefs);
    }
  }, [profile]);

  const updatePreferences = useCallback(
    (updates: Partial<Preferences>, options?: { skipCloudSync?: boolean }) => {
      setPreferences((prev) => {
        const merged = { ...prev, ...updates };
        if (!options?.skipCloudSync) {
          persistence.queueSave(merged);
        } else {
          storage.set(STORAGE_KEYS.PREFERENCES, merged);
        }
        return merged;
      });
    },
    [persistence],
  );

  usePreferenceSync(updatePreferences);

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
