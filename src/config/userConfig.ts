import type { Preferences } from '../types';
import { STORAGE_KEYS, type StorageKey, storage } from './storage';

export { STORAGE_KEYS, type StorageKey };

export const DEFAULT_PREFERENCES: Preferences = {
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
  theme: 'system',
};

export function getPreferences(): Preferences {
  return storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
}

export function savePreferences(preferences: Preferences): void {
  storage.set(STORAGE_KEYS.PREFERENCES, preferences);
}

export function clearPreferences(): void {
  storage.remove(STORAGE_KEYS.PREFERENCES);
}
