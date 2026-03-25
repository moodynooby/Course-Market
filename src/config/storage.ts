import { ENV } from './devConfig';

const STORAGE_KEYS = {
  COURSES: 'auraishub_courses',
  SECTIONS: 'auraishub_sections',
  PREFERENCES: 'auraishub_preferences',
  COURSE_SELECTIONS: 'auraishub_course_selections',
  THEME_MODE: 'theme-mode',
  LLM_CONFIG: 'llm-byok-config',
} as const;

function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed = JSON.parse(item);
    // If default is a primitive (string/number/boolean), return parsed value directly
    if (defaultValue === null || typeof defaultValue !== 'object') {
      return parsed as T;
    }
    // For objects, merge with defaults
    return { ...defaultValue, ...parsed };
  } catch (error) {
    if (ENV.IS_DEV) {
      console.error(`Failed to parse ${key} from localStorage:`, error);
    }
    return defaultValue;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (ENV.IS_DEV) {
      console.error(`Failed to save ${key} to localStorage:`, error);
    }
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    if (ENV.IS_DEV) {
      console.error(`Failed to remove ${key} from localStorage:`, error);
    }
  }
}

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const storage = {
  keys: STORAGE_KEYS,

  get<T>(key: StorageKey, defaultValue: T): T {
    return safeGetItem(key, defaultValue);
  },

  set<T>(key: StorageKey, value: T): void {
    safeSetItem(key, value);
  },

  remove(key: StorageKey): void {
    safeRemoveItem(key);
  },
};

export { STORAGE_KEYS };
