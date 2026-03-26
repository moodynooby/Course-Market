import type { Preferences, UserProfile } from '../types';
import { ApiError, api } from './apiClient';

export async function getUserProfile(token: string): Promise<UserProfile | null> {
  try {
    const result = await api.get<{ profile: UserProfile }>('/user-profile', token);
    return result.profile;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    console.error('[onboardingApi] getUserProfile failed:', error);
    throw error;
  }
}

export async function saveUserProfile(
  token: string,
  profile: Partial<UserProfile>,
): Promise<UserProfile> {
  try {
    const result = await api.post<{ profile: UserProfile }>('/user-profile', profile, token);
    return result.profile;
  } catch (error) {
    console.error('[onboardingApi] saveUserProfile failed:', error);
    throw error;
  }
}

export async function updateUserProfile(
  token: string,
  updates: Partial<UserProfile>,
): Promise<UserProfile> {
  return saveUserProfile(token, updates as any);
}

export async function completeOnboarding(
  token: string,
  preferences?: Preferences,
): Promise<UserProfile> {
  try {
    return saveUserProfile(token, {
      onboardingCompleted: true,
      preferences,
    });
  } catch (error) {
    console.error('[onboardingApi] completeOnboarding failed:', error);
    throw error;
  }
}
