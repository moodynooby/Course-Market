import { useEffect, useRef } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useConfigContext } from '../context/ConfigContext';
import type { Preferences } from '../types';
import { DEFAULT_PREFERENCES, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

/**
 * Pure, side-effect-free merge rules for local-to-cloud preferences.
 *
 * Merge rules:
 *  1. Cloud profile empty      → push local preferences to cloud (one-time).
 *  2. Local marked dirty       → merge cloud + local (local wins) and push.
 *  3. Local untouched defaults → pull cloud preferences into local storage.
 */
export function decidePreferenceSync(payload: {
  profilePreferences: Preferences | null | undefined;
  localPreferences: Preferences;
  isDirty: boolean;
}):
  | { action: 'push'; preferences: Preferences }
  | { action: 'pull'; preferences: Preferences }
  | { action: 'none' } {
  const { profilePreferences, localPreferences, isDirty } = payload;

  const cloudIsEmpty =
    !profilePreferences ||
    Object.keys(profilePreferences).length === 0 ||
    profilePreferences.avoidDays === undefined;

  const localEqualsCloud =
    !cloudIsEmpty && JSON.stringify(localPreferences) === JSON.stringify(profilePreferences);

  if (cloudIsEmpty) {
    return { action: 'push', preferences: localPreferences };
  }
  if (isDirty && !localEqualsCloud) {
    return {
      action: 'push',
      preferences: { ...profilePreferences, ...localPreferences },
    };
  }
  if (!localEqualsCloud) {
    return { action: 'pull', preferences: profilePreferences };
  }
  return { action: 'none' };
}

/**
 * Post-login local-to-cloud preference synchronization.
 *
 * On first sign-in, locally tuned day/time preferences (persisted in
 * localStorage under `STORAGE_KEYS.PREFERENCES`) are merged into the cloud
 * profile so that no work is lost. A `PREFS_DIRTY` flag distinguishes between
 * a freshly opened browser (defaults, nothing to push), preferences the user
 * actively tuned locally (push local over cloud), and an untouched browser
 * with an existing cloud profile (pull cloud down).
 */
export function usePreferenceSync() {
  const { profile, isAuthenticated, updateProfile } = useAuthContext();
  const { updatePreferences } = useConfigContext();
  const synced = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !profile || synced.current) return;
    synced.current = true;

    const localPrefs = storage.get(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
    const isDirty = storage.get(STORAGE_KEYS.PREFS_DIRTY, false);

    const decision = decidePreferenceSync({
      profilePreferences: (profile.preferences ?? null) as Preferences | null,
      localPreferences: localPrefs,
      isDirty,
    });

    if (decision.action === 'push') {
      void updateProfile({ preferences: decision.preferences });
      storage.remove(STORAGE_KEYS.PREFS_DIRTY);
    } else if (decision.action === 'pull') {
      updatePreferences(decision.preferences);
    }
    // 'none' requires no work.
  }, [isAuthenticated, profile, updateProfile, updatePreferences]);
}

/** Marks locally tuned preferences as dirty so the next sync pushes them. */
export function markPreferencesDirty(): void {
  storage.set(STORAGE_KEYS.PREFS_DIRTY, true);
}
