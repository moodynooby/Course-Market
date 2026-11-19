import type { Course, Section } from '../src/types';

export interface SemesterSummary {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SubjectSummary {
  subject: string;
  courseCount: number;
}

export interface CourseSearchFilters {
  semesterId: string;
  q?: string;
  subject?: string;
  openSeatsOnly?: boolean;
  minCredits?: number;
  maxCredits?: number;
  limit: number;
  offset: number;
}

export interface CourseSearchResult {
  courses: Course[];
  sections: Section[];
  total: number;
}

export interface CourseDetailsResult {
  course: Course;
  sections: Section[];
}

export interface CoursesResolutionResult {
  courses: Course[];
  sections: Section[];
  missing: string[];
}

export interface SectionsResolutionResult {
  courses: Course[];
  sections: Section[];
  missing: string[];
}

export interface SectionPairSelection {
  courseCode: string;
  sectionNumber: string;
}

export interface CourseDataSource {
  listSemesters(): Promise<SemesterSummary[]>;
  listSubjects(semesterId: string): Promise<SubjectSummary[]>;
  searchCourses(filters: CourseSearchFilters): Promise<CourseSearchResult>;
  getCourseDetails(
    semesterId: string,
    identifier: { courseId?: string; courseCode?: string },
  ): Promise<CourseDetailsResult | null>;
  getCoursesByIdentifiers(
    semesterId: string,
    identifiers: { courseIds?: string[]; courseCodes?: string[] },
  ): Promise<CoursesResolutionResult>;
  getSectionsByIds(semesterId: string, sectionIds: string[]): Promise<SectionsResolutionResult>;
  getSectionsByCourseAndNumber(
    semesterId: string,
    pairs: SectionPairSelection[],
  ): Promise<SectionsResolutionResult>;
}
