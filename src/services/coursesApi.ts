import type { Course, Section } from '../types';
import { api } from './apiClient';

type SemestersResponse = {
  semesters: Array<{ id: string; name: string; isActive: boolean }>;
};

let semestersPromise: Promise<SemestersResponse> | null = null;

/**
 * Fetch available semesters. Uses a shared promise so all callers
 * across the app share one in-flight request (and one cached result
 * for the lifetime of the module). Failed requests are evicted so callers
 * can retry after transient network errors.
 */
export async function getSemesters(): Promise<SemestersResponse> {
  if (semestersPromise) return semestersPromise;

  const request = api.get<SemestersResponse>('/semesters').catch((error: unknown) => {
    semestersPromise = null;
    throw error;
  });
  semestersPromise = request;
  return request;
}

/**
 * Fetch course and section data for a semester from the server-side DB.
 */
export async function getSemesterData(
  semesterId: string,
): Promise<{ courses: Course[]; sections: Section[] }> {
  return api.get(`/semesters/${semesterId}/data`);
}

export interface CourseSearchParams {
  semesterId: string;
  query?: string;
  subject?: string;
  openSeatsOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface CourseSearchResponse {
  courses: Course[];
  sections: Section[];
  total: number;
}

/**
 * Perform server-side course search, filtering, and pagination.
 */
export async function searchCoursesApi(params: CourseSearchParams): Promise<CourseSearchResponse> {
  const query = new URLSearchParams();
  query.set('semesterId', params.semesterId);
  if (params.query?.trim()) query.set('q', params.query.trim());
  if (params.subject && params.subject !== 'all') query.set('subject', params.subject);
  if (params.openSeatsOnly) query.set('openSeatsOnly', 'true');
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));

  return api.get(`/courses/search?${query.toString()}`);
}
