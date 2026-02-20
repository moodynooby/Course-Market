// Storage service using localStorage (courses & user only — trades use the DB via tradesApi)

import type { Course, Section } from '../types';
import { STORAGE_KEYS } from './userConfig';
import { ENV } from './devConfig';

// Courses functions
export function saveCourses(courses: Course[], sections: Section[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
  } catch (error) {
    if (ENV.IS_DEV) {
      console.error('Failed to save courses to localStorage:', error);
    }
  }
}

export function getCourses(): { courses: Course[]; sections: Section[] } {
  try {
    const coursesStr = localStorage.getItem(STORAGE_KEYS.COURSES);
    const sectionsStr = localStorage.getItem(STORAGE_KEYS.SECTIONS);

    return {
      courses: coursesStr ? JSON.parse(coursesStr) : [],
      sections: sectionsStr ? JSON.parse(sectionsStr) : [],
    };
  } catch (error) {
    if (ENV.IS_DEV) {
      console.error('Failed to load courses from localStorage:', error);
    }
    return {
      courses: [],
      sections: [],
    };
  }
}
