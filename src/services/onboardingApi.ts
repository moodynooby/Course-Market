import type { Preferences, Semester, UserProfile } from '../types';
import { ApiError, api } from './apiClient';

export async function getUserProfile(token: string): Promise<UserProfile | null> {
  try {
    const result = await api.get<{ profile: UserProfile }>('/user-profile', token);
    return result.profile;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function saveUserProfile(
  token: string,
  profile: Partial<UserProfile>,
): Promise<UserProfile> {
  const result = await api.post<{ profile: UserProfile }>('/user-profile', profile, token);
  return result.profile;
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
  return saveUserProfile(token, {
    onboardingCompleted: true,
    preferences,
  });
}

export async function getSemesters(): Promise<Semester[]> {
  const result = await api.get<{ semesters: Semester[] }>('/semesters');
  return result.semesters;
}
