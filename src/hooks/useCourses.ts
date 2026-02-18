import { useState, useEffect } from 'react';
import type { Course, Section } from '../types';

interface CoursesState {
  courses: Course[];
  sections: Section[];
  isLoaded: boolean;
  parseErrors: string[];
  parseWarnings: string[];
}

interface CoursesActions {
  loadCSV: (csvContent: string) => Promise<void>;
  reset: () => void;
  getCourseSections: (courseId: string) => Section[];
  getCourseById: (courseId: string) => Course | undefined;
  getSubjectList: () => string[];
}

type CoursesHook = CoursesState & CoursesActions;

const STORAGE_KEY = 'course_market_courses';

export function useCourses(): CoursesHook {
  const [state, setState] = useState<CoursesState>({
    courses: [],
    sections: [],
    isLoaded: false,
    parseErrors: [],
    parseWarnings: [],
  });

  const loadCSV = async (csvContent: string): Promise<void> => {
    try {
      const { parseCSV } = await import('../utils/csv');
      const result = parseCSV(csvContent);

      setState({
        courses: result.courses,
        sections: result.sections,
        isLoaded: result.success,
        parseErrors: result.errors,
        parseWarnings: result.warnings,
      });

      if (result.success) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          courses: result.courses,
          sections: result.sections,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        parseErrors: [`Failed to parse CSV: ${(error as Error).message}`],
        parseWarnings: prev.parseWarnings,
      }));
    }
  };

  const reset = (): void => {
    setState({
      courses: [],
      sections: [],
      isLoaded: false,
      parseErrors: [],
      parseWarnings: [],
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  const getCourseSections = (courseId: string): Section[] => {
    return state.sections.filter(section => section.courseId === courseId);
  };

  const getCourseById = (courseId: string): Course | undefined => {
    return state.courses.find(course => course.id === courseId);
  };

  const getSubjectList = (): string[] => {
    const subjects = new Set(state.courses.map(course => course.subject));
    return Array.from(subjects).sort();
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setState({
          courses: data.courses || [],
          sections: data.sections || [],
          isLoaded: true,
          parseErrors: [],
          parseWarnings: [],
        });
      }
    } catch (error) {
      console.warn('Failed to load stored courses:', error);
    }
  }, []);

  return {
    ...state,
    loadCSV,
    reset,
    getCourseSections,
    getCourseById,
    getSubjectList,
  };
}