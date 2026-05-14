import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Preferences } from '../types';
import type { BYOKConfig } from '../utils/constants';
import { DEFAULT_LLM_CONFIG, DEFAULT_PREFERENCES, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import { useAuthContext } from './AuthContext';

interface ConfigContextValue {
  preferences: Preferences;
  llmConfig: BYOKConfig;
  loading: boolean;
  updatePreferences: (updates: Partial<Preferences>) => void;
  updateLlmConfig: (config: BYOKConfig) => void;
  resetPreferences: () => void;
  resetLlmConfig: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

interface ConfigProviderProps {
  children: React.ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const { profile, updateProfile } = useAuthContext();
  const profileLoadedRef = useRef(false);

  const [preferences, setPreferences] = useState<Preferences>(() =>
    storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES),
  );
  const [llmConfig, setLlmConfig] = useState<BYOKConfig>(() =>
    storage.get(STORAGE_KEYS.LLM_CONFIG, DEFAULT_LLM_CONFIG),
  );
  const [loading, setLoading] = useState(true);

  // Sync from backend profile on first load (source of truth across devices)
  useEffect(() => {
    if (profile && !profileLoadedRef.current) {
      profileLoadedRef.current = true;
      if (profile.preferences) {
        setPreferences(profile.preferences);
        storage.set(STORAGE_KEYS.PREFERENCES, profile.preferences);
      }
      if (profile.llmConfig) {
        const config = profile.llmConfig as unknown as BYOKConfig;
        setLlmConfig(config);
        storage.set(STORAGE_KEYS.LLM_CONFIG, config);
      }
      setLoading(false);
    } else if (profile === null) {
      setLoading(false);
    }
  }, [profile]);

  const saveToBackend = useCallback(
    async (fields: Record<string, unknown>) => {
      try {
        await updateProfile(fields);
      } catch (error) {
        console.error('[ConfigContext] Failed to sync to backend:', error);
      }
    },
    [updateProfile],
  );

  const updatePreferences = useCallback(
    (updates: Partial<Preferences>) => {
      setPreferences((prev) => {
        const merged = { ...prev, ...updates };
        storage.set(STORAGE_KEYS.PREFERENCES, merged);
        saveToBackend({ preferences: merged });
        return merged;
      });
    },
    [saveToBackend],
  );

  const updateLlmConfig = useCallback(
    (config: BYOKConfig) => {
      setLlmConfig(config);
      storage.set(STORAGE_KEYS.LLM_CONFIG, config);
      const { initProgressCallback: _, ...persistedConfig } = config;
      saveToBackend({ llmConfig: persistedConfig });
    },
    [saveToBackend],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    storage.set(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
    saveToBackend({ preferences: DEFAULT_PREFERENCES });
  }, [saveToBackend]);

  const resetLlmConfig = useCallback(() => {
    setLlmConfig(DEFAULT_LLM_CONFIG);
    storage.set(STORAGE_KEYS.LLM_CONFIG, DEFAULT_LLM_CONFIG);
    saveToBackend({ llmConfig: DEFAULT_LLM_CONFIG });
  }, [saveToBackend]);

  const value = useMemo(
    () => ({
      preferences,
      llmConfig,
      loading,
      updatePreferences,
      updateLlmConfig,
      resetPreferences,
      resetLlmConfig,
    }),
    [
      preferences,
      llmConfig,
      loading,
      updatePreferences,
      updateLlmConfig,
      resetPreferences,
      resetLlmConfig,
    ],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfigContext() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfigContext must be used within a ConfigProvider');
  }
  return context;
}
