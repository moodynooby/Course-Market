// Database service using localStorage (courses & user only — trades use the DB via tradesApi)

import type { Course, Section } from '../types';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Courses functions
export function saveCourses(courses: Course[], sections: Section[]) {
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
}

export function getCourses(): { courses: Course[]; sections: Section[] } {
  const coursesStr = localStorage.getItem(STORAGE_KEYS.COURSES);
  const sectionsStr = localStorage.getItem(STORAGE_KEYS.SECTIONS);

  return {
    courses: coursesStr ? JSON.parse(coursesStr) : [],
    sections: sectionsStr ? JSON.parse(sectionsStr) : [],
  };
}
