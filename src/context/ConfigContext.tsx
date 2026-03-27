import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LLM_CONFIG, DEFAULT_PREFERENCES, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';
import type { Preferences } from '../types';

interface BYOKConfig {
  provider: 'webllm' | 'groq';
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

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
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [llmConfig, setLlmConfig] = useState<BYOKConfig>(DEFAULT_LLM_CONFIG);
  const [loading, setLoading] = useState(true);

  // Load configs from localStorage on mount
  useEffect(() => {
    try {
      setPreferences(storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES));
      setLlmConfig(storage.get(STORAGE_KEYS.LLM_CONFIG, DEFAULT_LLM_CONFIG));
    } catch (error) {
      console.error('[ConfigContext] Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback((updates: Partial<Preferences>) => {
    setPreferences((prev) => {
      const merged = { ...prev, ...updates };
      storage.set(STORAGE_KEYS.PREFERENCES, merged);
      return merged;
    });
  }, []);

  const updateLlmConfig = useCallback((config: BYOKConfig) => {
    setLlmConfig(config);
    storage.set(STORAGE_KEYS.LLM_CONFIG, config);
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    storage.set(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
  }, []);

  const resetLlmConfig = useCallback(() => {
    setLlmConfig(DEFAULT_LLM_CONFIG);
    storage.set(STORAGE_KEYS.LLM_CONFIG, DEFAULT_LLM_CONFIG);
  }, []);

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
