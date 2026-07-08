import type { Course, Section } from '../types';
import { api } from './apiClient';

let semestersPromise: Promise<{
  semesters: Array<{ id: string; name: string; jsonUrl: string; isActive: boolean }>;
}> | null = null;

/**
 * Fetch available semesters. Uses a shared promise so all callers
 * across the app share one in-flight request (and one cached result
 * for the lifetime of the module).
 */
export async function getSemesters(): Promise<{
  semesters: Array<{ id: string; name: string; jsonUrl: string; isActive: boolean }>;
}> {
  if (!semestersPromise) {
    semestersPromise = api.get('/semesters');
  }
  return semestersPromise;
}

/**
 * Fetch course and section data for a semester from the server-side DB.
 */
export async function getSemesterData(
  semesterId: string,
): Promise<{ courses: Course[]; sections: Section[] }> {
  return api.get(`/semesters/${semesterId}/data`);
}
