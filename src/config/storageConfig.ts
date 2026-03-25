import type { Course, Section, SectionJSON } from '../types';
import { STORAGE_KEYS, storage } from './storage';

export function saveCourses(courses: Course[], sections: Section[] | SectionJSON[]): void {
  storage.set(STORAGE_KEYS.COURSES, courses);
  storage.set(STORAGE_KEYS.SECTIONS, sections);
}

export function getCourses(): { courses: Course[]; sections: Section[] } {
  const courses = storage.get<Course[]>(STORAGE_KEYS.COURSES, []);
  const sections = storage.get<Section[]>(STORAGE_KEYS.SECTIONS, []);
  return { courses, sections };
}
