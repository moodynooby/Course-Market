import { useState, useLayoutEffect } from 'react';
import type { Preferences } from '../types';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface PreferencesState {
  preferences: Preferences;
  isLoaded: boolean;
}

interface PreferencesActions {
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  updateMultiplePreferences: (updates: Partial<Preferences>) => void;
  reset: () => void;
}

type PreferencesHook = PreferencesState & PreferencesActions;
const DEFAULT_PREFERENCES: Preferences = {
  userId: '',
  displayName: 'Anonymous User',
  email: '',
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: false,
  preferAfternoon: false,
  maxCredits: 18,
  minCredits: 12,
  avoidDays: [],
  excludeInstructors: [],
};

export function usePreferences(userId?: string): PreferencesHook {
  const [state, setState] = useState<PreferencesState>({
    preferences: { ...DEFAULT_PREFERENCES },
    isLoaded: false,
  });

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    setState((prev) => {
      const updatedPreferences = {
        ...prev.preferences,
        [key]: value,
      };

      if (userId) {
        updatedPreferences.userId = userId;
      }

      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updatedPreferences));

      return {
        ...prev,
        preferences: updatedPreferences,
      };
    });
  };

  const updateMultiplePreferences = (updates: Partial<Preferences>): void => {
    setState((prev) => {
      const updatedPreferences = {
        ...prev.preferences,
        ...updates,
      };

      if (userId) {
        updatedPreferences.userId = userId;
      }

      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updatedPreferences));

      return {
        ...prev,
        preferences: updatedPreferences,
      };
    });
  };

  const reset = (): void => {
    const defaultPrefs = { ...DEFAULT_PREFERENCES };
    if (userId) {
      defaultPrefs.userId = userId;
    }

    setState({
      preferences: defaultPrefs,
      isLoaded: false,
    });

    localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
  };

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        const preferences = { ...DEFAULT_PREFERENCES, ...parsed };

        if (userId) {
          preferences.userId = userId;
        }

        setState({
          preferences,
          isLoaded: true,
        });
      } else {
        const defaultPrefs = { ...DEFAULT_PREFERENCES };
        if (userId) {
          defaultPrefs.userId = userId;
        }
        setState({
          preferences: defaultPrefs,
          isLoaded: true,
        });
      }
    } catch (error) {
      console.warn('Failed to load stored preferences:', error);

      const defaultPrefs = { ...DEFAULT_PREFERENCES };
      if (userId) {
        defaultPrefs.userId = userId;
      }
      setState({
        preferences: defaultPrefs,
        isLoaded: true,
      });
    }
  }, [userId]);

  return {
    ...state,
    updatePreference,
    updateMultiplePreferences,
    reset,
  };
}
