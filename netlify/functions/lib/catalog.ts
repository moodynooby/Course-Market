import * as schema from '../../../db/schema';
import type { Course, Section, TimeSlot } from '../../../src/types';

export const courseColumns = {
  id: schema.semesterCourses.id,
  courseCode: schema.semesterCourses.courseCode,
  name: schema.semesterCourses.name,
  subject: schema.semesterCourses.subject,
  credits: schema.semesterCourses.credits,
  description: schema.semesterCourses.description,
} as const;

export const sectionColumns = {
  id: schema.semesterSections.id,
  courseId: schema.semesterSections.courseId,
  sectionNumber: schema.semesterSections.sectionNumber,
  instructor: schema.semesterSections.instructor,
  capacity: schema.semesterSections.capacity,
  enrolled: schema.semesterSections.enrolled,
  timeSlots: schema.semesterSections.timeSlots,
} as const;

interface CourseRow {
  id: string;
  courseCode: string;
  name: string;
  subject: string;
  credits: number;
  description: string | null;
}

interface SectionRow {
  id: string;
  courseId: string;
  sectionNumber: string;
  instructor: string;
  capacity: number;
  enrolled: number;
  timeSlots: unknown;
}

export function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    code: row.courseCode,
    name: row.name,
    subject: row.subject,
    credits: row.credits,
    description: row.description ?? undefined,
  };
}

export function toSection(row: SectionRow): Section {
  return {
    id: row.id,
    courseId: row.courseId,
    sectionNumber: row.sectionNumber,
    instructor: row.instructor,
    capacity: row.capacity,
    enrolled: row.enrolled,
    timeSlots: row.timeSlots as TimeSlot[],
  };
}
