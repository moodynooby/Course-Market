import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
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
}

const DB_NAME = 'course-market-db';
const DB_VERSION = 2;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DATA_VERSION_PREFIX = 'v';

let dbPromise: Promise<IDBPDatabase<CourseMarketDB>> | null = null;
let currentDataVersion: number | null = null;

async function getCurrentDataVersion(): Promise<number> {
  if (currentDataVersion !== null) return currentDataVersion;
  try {
    const res = await fetch('/data-version.json');
    const meta = await res.json();
    currentDataVersion = meta.dataVersion;
    return meta.dataVersion;
  } catch {
    return 0;
  }
}

/**
 * Get or create database connection
 */
function getDB(): Promise<IDBPDatabase<CourseMarketDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CourseMarketDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of ['courses', 'sections'] as const) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: 'id' });
            store.createIndex('by-semester', 'semesterId');
          }
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Cache courses in IndexedDB
 */
export async function cacheCourses(semesterId: string, courses: Course[]): Promise<void> {
  const db = await getDB();
  const dataVersion = await getCurrentDataVersion();
  const tx = db.transaction('courses', 'readwrite');

  await tx.store.put({
    id: `courses:${semesterId}`,
    data: courses,
    timestamp: Date.now(),
    semesterId,
    version: `${DATA_VERSION_PREFIX}${dataVersion}`,
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
  const cached = await db.get('courses', `courses:${semesterId}`);

  if (!cached) return null;

  const dataVersion = await getCurrentDataVersion();
  const storedVersion = cached.version;

  if (
    !storedVersion.startsWith(DATA_VERSION_PREFIX) ||
    parseInt(storedVersion.slice(1), 10) !== dataVersion ||
    Date.now() - cached.timestamp > CACHE_TTL
  ) {
    await db.delete('courses', `courses:${semesterId}`);
    return null;
  }

  return {
    courses: cached.data,
    timestamp: cached.timestamp,
    version: storedVersion,
  };
}

/**
 * Cache sections in IndexedDB
 */
export async function cacheSections(semesterId: string, sections: Section[]): Promise<void> {
  const db = await getDB();
  const dataVersion = await getCurrentDataVersion();
  const tx = db.transaction('sections', 'readwrite');

  await tx.store.put({
    id: `sections:${semesterId}`,
    data: sections,
    timestamp: Date.now(),
    semesterId,
    version: `${DATA_VERSION_PREFIX}${dataVersion}`,
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
  const cached = await db.get('sections', `sections:${semesterId}`);

  if (!cached) return null;

  const dataVersion = await getCurrentDataVersion();
  const storedVersion = cached.version;

  if (
    !storedVersion.startsWith(DATA_VERSION_PREFIX) ||
    parseInt(storedVersion.slice(1), 10) !== dataVersion ||
    Date.now() - cached.timestamp > CACHE_TTL
  ) {
    await db.delete('sections', `sections:${semesterId}`);
    return null;
  }

  return {
    sections: cached.data,
    timestamp: cached.timestamp,
    version: storedVersion,
  };
}

/**
 * Cache semester JSON data
 */
export async function cacheSemesterData(
  semesterId: string,
  courses: Course[],
  sections: Section[],
): Promise<void> {
  await Promise.all([cacheCourses(semesterId, courses), cacheSections(semesterId, sections)]);
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
