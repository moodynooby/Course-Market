import type { UserProfile, Preferences, Semester } from '../types';

const API_BASE = '/.netlify/functions';

/**
 * Fetch user profile from backend
 */
export async function getUserProfile(token: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`${API_BASE}/user-profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Create or update user profile
 */
export async function saveUserProfile(
  token: string,
  profile: Partial<UserProfile>,
): Promise<UserProfile> {
  try {
    const response = await fetch(`${API_BASE}/user-profile`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save profile');
    }

    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

/**
 * Update specific fields in user profile
 */
export async function updateUserProfile(
  token: string,
  updates: Partial<UserProfile>,
): Promise<UserProfile> {
  return saveUserProfile(token, updates as any);
}

/**
 * Mark onboarding as completed
 */
export async function completeOnboarding(
  token: string,
  preferences?: Preferences,
): Promise<UserProfile> {
  return saveUserProfile(token, {
    onboardingCompleted: true,
    preferences,
  });
}

/**
 * Fetch available semesters from backend
 */
export async function getSemesters(): Promise<Semester[]> {
  try {
    const response = await fetch(`${API_BASE}/semesters`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch semesters: ${response.status}`);
    }

    const data = await response.json();
    return data.semesters;
  } catch (error) {
    console.error('Error fetching semesters:', error);
    throw error;
  }
}
