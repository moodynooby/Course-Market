import type { SemesterJSON } from '../types';
import { api } from './apiClient';

/**
 * Fetch available semesters with JSON URLs
 */
export async function getSemesters(): Promise<{
  semesters: Array<{ id: string; name: string; jsonUrl: string; isActive: boolean }>;
}> {
  return api.get('/semesters');
}

/**
 * Fetch complete semester data including all sections with time slots
 * This is the primary data loading method - fetches JSON directly from CDN
 */
export async function getSemesterData(semesterId: string): Promise<SemesterJSON> {
  const { semesters } = await getSemesters();

  if (!semesters || semesters.length === 0) {
    throw new Error('No semesters available');
  }

  const semester = semesters.find((s) => s.id === semesterId);

  if (!semester) {
    throw new Error(`Semester '${semesterId}' not found`);
  }

  // Fetch the complete semester JSON from CDN
  const response = await fetch(semester.jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch semester JSON: ${response.status}`);
  }
  return response.json();
}
