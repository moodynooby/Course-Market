// Database service using localStorage (courses & user only — trades use the DB via tradesApi)

import type { Course, Section } from '../types';
import { STORAGE_KEYS } from '../constants/storageKeys';

// User functions
export function saveUser(user: any) {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function getUser(): any | null {
  const saved = localStorage.getItem(STORAGE_KEYS.USER);
  return saved ? JSON.parse(saved) : null;
}

export function clearUser() {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

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
