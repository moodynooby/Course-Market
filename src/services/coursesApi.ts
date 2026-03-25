import type { Course, SectionJSON, SemesterJSON } from '../types';

const API_BASE = '/.netlify/functions';

/**
 * Fetch courses for a specific semester from database
 * This is lightweight - only course metadata, no sections
 */
export async function getCoursesBySemester(semesterId: string): Promise<{
  courses: Course[];
  subjects: string[];
  semester: string;
  count: number;
}> {
  try {
    const response = await fetch(`${API_BASE}/courses?semester=${encodeURIComponent(semesterId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

/**
 * Fetch sections index for a semester
 * Returns the JSON URL and lightweight section data
 */
export async function getSectionsBySemester(semesterId: string): Promise<{
  sections: any[];
  jsonUrl: string;
  semester: string;
  count: number;
}> {
  try {
    const response = await fetch(
      `${API_BASE}/sections?semester=${encodeURIComponent(semesterId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sections: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching sections:', error);
    throw error;
  }
}

/**
 * Fetch full semester data from static JSON file (CDN-cached)
 * This is the hybrid approach - full details from static file
 */
export async function getSemesterData(semesterId: string): Promise<SemesterJSON> {
  try {
    // First get the JSON URL from the sections endpoint
    const sectionsData = await getSectionsBySemester(semesterId);

    // Fetch the full JSON file (will be CDN-cached)
    const response = await fetch(sectionsData.jsonUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch semester JSON: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching semester data:', error);
    throw error;
  }
}

/**
 * Direct fetch of semester JSON file (use when you know the URL)
 */
export async function fetchSemesterJSON(jsonUrl: string): Promise<SemesterJSON> {
  try {
    const response = await fetch(jsonUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching semester JSON:', error);
    throw error;
  }
}

/**
 * Get all unique subjects from semester data
 */
export function getSubjectsFromSemester(semesterData: SemesterJSON): string[] {
  return (
    semesterData.metadata.subjects ||
    Array.from(new Set(semesterData.sections.map((s) => s.subject))).sort()
  );
}

/**
 * Get courses grouped by subject from semester data
 */
export function getCoursesBySubject(semesterData: SemesterJSON): Record<string, Course[]> {
  const courses: Record<string, Course[]> = {};

  for (const section of semesterData.sections) {
    if (!courses[section.subject]) {
      courses[section.subject] = [];
    }

    // Check if course already exists
    const exists = courses[section.subject].some((c) => c.code === section.courseCode);
    if (!exists) {
      courses[section.subject].push({
        id: section.id,
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
 * Get sections for a specific course
 */
export function getSectionsForCourse(
  semesterData: SemesterJSON,
  courseCode: string,
): SectionJSON[] {
  return semesterData.sections.filter((s) => s.courseCode === courseCode);
}
