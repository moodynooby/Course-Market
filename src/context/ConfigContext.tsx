import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Preferences } from '../types';
import type { BYOKConfig } from '../utils/constants';
import { DEFAULT_LLM_CONFIG, DEFAULT_PREFERENCES, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { useAuthContext } from './AuthContext';

interface ConfigContextValue {
  preferences: Preferences;
  llmConfig: BYOKConfig;
  updatePreferences: (updates: Partial<Preferences>) => void;
  updateLlmConfig: (config: BYOKConfig) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated, updateProfile } = useAuthContext();

  const [preferences, setPreferences] = useState<Preferences>(() =>
    storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES),
  );
  const [llmConfig, setLlmConfig] = useState<BYOKConfig>(() =>
    storage.get(STORAGE_KEYS.LLM_CONFIG, DEFAULT_LLM_CONFIG),
  );

  useEffect(() => {
    if (profile) {
      if (profile.preferences) {
        setPreferences(profile.preferences);
        storage.set(STORAGE_KEYS.PREFERENCES, profile.preferences);
      }
      if (profile.llmConfig) {
        const config = profile.llmConfig as unknown as BYOKConfig;
        setLlmConfig(config);
        storage.set(STORAGE_KEYS.LLM_CONFIG, config);
      }
    }
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

  const updateLlmConfig = useCallback(
    (config: BYOKConfig) => {
      setLlmConfig(config);
      storage.set(STORAGE_KEYS.LLM_CONFIG, config);
      if (isAuthenticated) {
        const { initProgressCallback: _, ...persistedConfig } = config;
        updateProfile({ llmConfig: persistedConfig }).catch(console.error);
      }
    },
    [isAuthenticated, updateProfile],
  );

  return (
    <ConfigContext.Provider value={{ preferences, llmConfig, updatePreferences, updateLlmConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfigContext() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfigContext must be used within a ConfigProvider');
  return ctx;
}
