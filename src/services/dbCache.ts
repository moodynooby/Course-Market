import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Course, Section } from '../types';

interface CourseMarketDB extends DBSchema {
  courses: {
    key: string;
    value: {
      id: string;
      data: Course[];
      timestamp: number;
      semesterId: string;
      version: string;
    };
    indexes: { 'by-semester': string };
  };
  sections: {
    key: string;
    value: {
      id: string;
      data: Section[];
      timestamp: number;
      semesterId: string;
      version: string;
    };
    indexes: { 'by-semester': string };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      timestamp: number;
    };
  };
}

const DB_NAME = 'course-market-db';
const DB_VERSION = 1;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let dbPromise: Promise<IDBPDatabase<CourseMarketDB>> | null = null;

/**
 * Get or create database connection
 */
function getDB(): Promise<IDBPDatabase<CourseMarketDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CourseMarketDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Courses store
        if (!db.objectStoreNames.contains('courses')) {
          const courseStore = db.createObjectStore('courses', { keyPath: 'id' });
          courseStore.createIndex('by-semester', 'semesterId');
        }

        // Sections store
        if (!db.objectStoreNames.contains('sections')) {
          const sectionStore = db.createObjectStore('sections', { keyPath: 'id' });
          sectionStore.createIndex('by-semester', 'semesterId');
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Cache courses in IndexedDB
 */
export async function cacheCourses(
  semesterId: string,
  courses: Course[],
  version: string,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('courses', 'readwrite');

  await tx.store.put({
    id: `courses:${semesterId.toLowerCase()}`,
    data: courses,
    timestamp: Date.now(),
    semesterId: semesterId.toLowerCase(),
    version,
  });

  await tx.done;
}

/**
 * Get cached courses from IndexedDB
 */
export async function getCachedCourses(
  semesterId: string,
): Promise<{ courses: Course[]; timestamp: number; version: string } | null> {
  const db = await getDB();
  const cached = await db.get('courses', `courses:${semesterId.toLowerCase()}`);

  if (!cached) return null;

  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    // Delete expired cache
    await db.delete('courses', `courses:${semesterId.toLowerCase()}`);
    return null;
  }

  return {
    courses: cached.data,
    timestamp: cached.timestamp,
    version: cached.version,
  };
}

/**
 * Cache sections in IndexedDB
 */
export async function cacheSections(
  semesterId: string,
  sections: Section[],
  version: string,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sections', 'readwrite');

  await tx.store.put({
    id: `sections:${semesterId.toLowerCase()}`,
    data: sections,
    timestamp: Date.now(),
    semesterId: semesterId.toLowerCase(),
    version,
  });

  await tx.done;
}

/**
 * Get cached sections from IndexedDB
 */
export async function getCachedSections(
  semesterId: string,
): Promise<{ sections: Section[]; timestamp: number; version: string } | null> {
  const db = await getDB();
  const cached = await db.get('sections', `sections:${semesterId.toLowerCase()}`);

  if (!cached) return null;

  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    // Delete expired cache
    await db.delete('sections', `sections:${semesterId.toLowerCase()}`);
    return null;
  }

  return {
    sections: cached.data,
    timestamp: cached.timestamp,
    version: cached.version,
  };
}

/**
 * Cache semester JSON data
 */
export async function cacheSemesterData(
  semesterId: string,
  courses: Course[],
  sections: Section[],
  version: string,
): Promise<void> {
  await Promise.all([
    cacheCourses(semesterId, courses, version),
    cacheSections(semesterId, sections, version),
  ]);
}

/**
 * Get cached semester data
 */
export async function getCachedSemesterData(semesterId: string): Promise<{
  courses: Course[];
  sections: Section[];
  timestamp: number;
  version: string;
} | null> {
  const [coursesResult, sectionsResult] = await Promise.all([
    getCachedCourses(semesterId),
    getCachedSections(semesterId),
  ]);

  if (!coursesResult || !sectionsResult) {
    return null;
  }

  return {
    courses: coursesResult.courses,
    sections: sectionsResult.sections,
    timestamp: coursesResult.timestamp,
    version: coursesResult.version,
  };
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  const db = await getDB();
  const txCourses = db.transaction('courses', 'readwrite');
  const txSections = db.transaction('sections', 'readwrite');

  await txCourses.store.clear();
  await txSections.store.clear();

  await txCourses.done;
  await txSections.done;
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  // Clear expired courses
  const courseTx = db.transaction('courses', 'readwrite');
  const allCourses = await courseTx.store.getAll();

  for (const course of allCourses) {
    if (now - course.timestamp > CACHE_TTL) {
      await courseTx.store.delete(course.id);
    }
  }

  await courseTx.done;

  // Clear expired sections
  const sectionTx = db.transaction('sections', 'readwrite');
  const allSections = await sectionTx.store.getAll();

  for (const section of allSections) {
    if (now - section.timestamp > CACHE_TTL) {
      await sectionTx.store.delete(section.id);
    }
  }

  await sectionTx.done;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  courseCount: number;
  sectionCount: number;
  totalSize: number;
}> {
  const db = await getDB();
  const courses = await db.getAll('courses');
  const sections = await db.getAll('sections');

  // Estimate size (rough approximation)
  const totalSize = JSON.stringify(courses).length + JSON.stringify(sections).length;

  return {
    courseCount: courses.length,
    sectionCount: sections.length,
    totalSize,
  };
}
