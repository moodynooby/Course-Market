import type { Preferences } from '../types';
import { ENV } from './devConfig';

// --- STORAGE KEYS ---
export const STORAGE_KEYS = {
  COURSES: 'course_market_courses',
  SECTIONS: 'course_market_sections',
  PREFERENCES: 'course_market_preferences',
  USER: 'course_market_user',
  SELECTIONS: 'course_market_selections',
  COURSE_SELECTIONS: 'course-selections',
  THEME_MODE: 'theme-mode',
  APP_USER: 'app-user',
} as const;

// --- PREFERENCES ---
export const DEFAULT_PREFERENCES: Preferences = {
  userId: '',
  displayName: '',
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

const PREFERENCES_STORAGE_KEY = STORAGE_KEYS.PREFERENCES;

export function getPreferences(): Preferences {
  try {
    const savedPrefs = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (savedPrefs) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(savedPrefs) };
    }
  } catch (error) {
    if (ENV.IS_DEV) console.error('Failed to parse preferences from localStorage:', error);
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    if (ENV.IS_DEV) console.error('Failed to save preferences to localStorage:', error);
  }
}

export function clearPreferences(): void {
  localStorage.removeItem(PREFERENCES_STORAGE_KEY);
}
