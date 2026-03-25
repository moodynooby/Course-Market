import type { Course, SectionJSON, SemesterJSON } from '../types';
import { api } from './apiClient';

export async function getCoursesBySemester(semesterId: string): Promise<{
  courses: Course[];
  subjects: string[];
  semester: string;
  count: number;
}> {
  return api.get(`/courses?semester=${encodeURIComponent(semesterId)}`);
}

export async function getSectionsBySemester(semesterId: string): Promise<{
  sections: any[];
  jsonUrl: string;
  semester: string;
  count: number;
}> {
  return api.get(`/sections?semester=${encodeURIComponent(semesterId)}`);
}

export async function getSemesterData(semesterId: string): Promise<SemesterJSON> {
  const sectionsData = await getSectionsBySemester(semesterId);
  const response = await fetch(sectionsData.jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch semester JSON: ${response.status}`);
  }
  return response.json();
}

export async function fetchSemesterJSON(jsonUrl: string): Promise<SemesterJSON> {
  const response = await fetch(jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.status}`);
  }
  return response.json();
}

export function getSubjectsFromSemester(semesterData: SemesterJSON): string[] {
  return (
    semesterData.metadata.subjects ||
    Array.from(new Set(semesterData.sections.map((s) => s.subject))).sort()
  );
}

export function getCoursesBySubject(semesterData: SemesterJSON): Record<string, Course[]> {
  const courses: Record<string, Course[]> = {};

  for (const section of semesterData.sections) {
    if (!courses[section.subject]) {
      courses[section.subject] = [];
    }

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

export function getSectionsForCourse(
  semesterData: SemesterJSON,
  courseCode: string,
): SectionJSON[] {
  return semesterData.sections.filter((s) => s.courseCode === courseCode);
}
