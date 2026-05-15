import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../constants';
import { storage } from '../storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves a string value', () => {
    storage.set(STORAGE_KEYS.THEME_MODE, 'dark');
    expect(storage.get(STORAGE_KEYS.THEME_MODE, 'light')).toBe('dark');
  });

  it('returns default for missing key', () => {
    const result = storage.get(STORAGE_KEYS.THEME_MODE, 'light');
    expect(result).toBe('light');
  });

  it('removes a stored value', () => {
    storage.set(STORAGE_KEYS.THEME_MODE, 'dark');
    storage.remove(STORAGE_KEYS.THEME_MODE);
    expect(storage.get(STORAGE_KEYS.THEME_MODE, 'light')).toBe('light');
  });

  it('stores and retrieves an object', () => {
    const prefs = { maxCredits: 18, minCredits: 12 };
    storage.set(STORAGE_KEYS.PREFERENCES, prefs);
    const result = storage.get(STORAGE_KEYS.PREFERENCES, {});
    expect(result).toEqual(prefs);
  });

  it('merges stored object with default', () => {
    storage.set(STORAGE_KEYS.PREFERENCES, { maxCredits: 15 });
    const result = storage.get(STORAGE_KEYS.PREFERENCES, { minCredits: 12, maxCredits: 18 });
    expect(result.maxCredits).toBe(15);
    expect(result.minCredits).toBe(12);
  });

  it('handles null default for non-existent key', () => {
    const result = storage.get(STORAGE_KEYS.THEME_MODE, null);
    expect(result).toBeNull();
  });
});
