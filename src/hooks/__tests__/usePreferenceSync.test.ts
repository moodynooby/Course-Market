import { describe, expect, it } from 'vitest';
import type { Preferences } from '../../types';
import { DEFAULT_PREFERENCES, STORAGE_KEYS } from '../../utils/constants';
import { decidePreferenceSync, markPreferencesDirty } from '../usePreferenceSync';

const CUSTOM_PREFERENCES: Preferences = {
  ...DEFAULT_PREFERENCES,
  preferredStartTime: '09:30',
  avoidDays: ['F'],
};

describe('decidePreferenceSync merge rules', () => {
  it('pushes local preferences to an empty cloud profile (one-time sync)', () => {
    const decision = decidePreferenceSync({
      profilePreferences: null,
      localPreferences: CUSTOM_PREFERENCES,
      isDirty: false,
    });

    expect(decision.action).toBe('push');
    expect(decision.action === 'push' && decision.preferences).toEqual(CUSTOM_PREFERENCES);
  });

  it('pushes local defaults as a cloud baseline when local is untouched', () => {
    const decision = decidePreferenceSync({
      profilePreferences: null,
      localPreferences: DEFAULT_PREFERENCES,
      isDirty: false,
    });

    expect(decision.action).toBe('push');
    if (decision.action === 'push') {
      expect(decision.preferences).toEqual(DEFAULT_PREFERENCES);
    }
  });

  it('merges with local precedence when local prefs are dirty', () => {
    const cloudPrefs = { ...DEFAULT_PREFERENCES, preferredStartTime: '07:00' };
    const decision = decidePreferenceSync({
      profilePreferences: cloudPrefs,
      localPreferences: CUSTOM_PREFERENCES,
      isDirty: true,
    });

    expect(decision.action).toBe('push');
    if (decision.action === 'push') {
      expect(decision.preferences.preferredStartTime).toBe('09:30');
      expect(decision.preferences.avoidDays).toEqual(['F']);
    }
  });

  it('does not push when local is dirty but identical to cloud', () => {
    const decision = decidePreferenceSync({
      profilePreferences: CUSTOM_PREFERENCES,
      localPreferences: CUSTOM_PREFERENCES,
      isDirty: true,
    });

    expect(decision.action).toBe('none');
  });

  it('pulls cloud preferences when local is untouched and different', () => {
    const cloudPrefs = { ...DEFAULT_PREFERENCES, preferMorning: true };
    const decision = decidePreferenceSync({
      profilePreferences: cloudPrefs,
      localPreferences: DEFAULT_PREFERENCES,
      isDirty: false,
    });

    expect(decision.action).toBe('pull');
    if (decision.action === 'pull') {
      expect(decision.preferences).toEqual(cloudPrefs);
    }
  });

  it('returns none when local and cloud already match', () => {
    const decision = decidePreferenceSync({
      profilePreferences: DEFAULT_PREFERENCES,
      localPreferences: DEFAULT_PREFERENCES,
      isDirty: false,
    });

    expect(decision.action).toBe('none');
  });

  it('treats a profile without avoidDays as empty (no baseline yet)', () => {
    const decision = decidePreferenceSync({
      profilePreferences: {
        ...DEFAULT_PREFERENCES,
        avoidDays: undefined as unknown as import('../../types').DayOfWeek[],
      },
      localPreferences: CUSTOM_PREFERENCES,
      isDirty: false,
    });

    expect(decision.action).toBe('push');
  });
});

describe('markPreferencesDirty', () => {
  it('sets the dirty flag in localStorage', () => {
    localStorage.clear();
    markPreferencesDirty();
    expect(localStorage.getItem(STORAGE_KEYS.PREFS_DIRTY)).toBe('true');
    localStorage.clear();
  });
});
