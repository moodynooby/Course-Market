import type { Course, SectionJSON, SemesterJSON } from '../types';
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
  // First get semester metadata to find the JSON URL
  const { semesters } = await getSemesters();
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

/**
 * Direct fetch of semester JSON from a known URL
 */
export async function fetchSemesterJSON(jsonUrl: string): Promise<SemesterJSON> {
  const response = await fetch(jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.status}`);
  }
  return response.json();
}

/**
 * Extract unique subjects from semester data
 */
export function getSubjectsFromSemester(semesterData: SemesterJSON): string[] {
  return (
    semesterData.metadata.subjects ||
    Array.from(new Set(semesterData.sections.map((s) => s.subject))).sort()
  );
}

/**
 * Transform semester sections into courses grouped by subject
 */
export function getCoursesBySubject(semesterData: SemesterJSON): Record<string, Course[]> {
  const courses: Record<string, Course[]> = {};

  for (const section of semesterData.sections) {
    if (!courses[section.subject]) {
      courses[section.subject] = [];
    }

    const exists = courses[section.subject].some((c) => c.code === section.courseCode);
    if (!exists) {
      courses[section.subject].push({
        id: section.courseCode,
        code: section.courseCode,
        name: section.courseName,
        subject: section.subject,
        credits: section.credits,
      });
    }
  }

  return courses;
}

/**
 * Get all sections for a specific course
 */
export function getSectionsForCourse(
  semesterData: SemesterJSON,
  courseCode: string,
): SectionJSON[] {
  return semesterData.sections.filter((s) => s.courseCode === courseCode);
}
