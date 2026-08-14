/**
 * Offline access to the schedule, courses, and professor data.
 *
 * On the web this is a regular in-memory/localStorage store; in the native
 * app the Capacitor shell guarantees the WebView bundle is always present,
 * and this module keeps the *data* layer available offline via IndexedDB so
 * students can open their timetable with zero connectivity (campus Wi-Fi
 * failing during registration week is the main use case).
 *
 * Usage:
 *   cacheSchedule(userId, schedule)   - pin the generated schedule
 *   getCachedSchedule(userId)         - retrieve while offline
 *   cacheProfessorRatings(ratings)    - pin ratings fetched from the API
 *   getCachedProfessorRatings()       - retrieve while offline
 */

const DB_NAME = 'auraishub-offline';
const DB_VERSION = 1;
const STORE_SCHEDULE = 'schedules';
const STORE_PROFESSORS = 'professor-ratings';
const STORE_CATALOG = 'course-catalog';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_SCHEDULE)) {
          db.createObjectStore(STORE_SCHEDULE, { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains(STORE_PROFESSORS)) {
          db.createObjectStore(STORE_PROFESSORS, { keyPath: 'professorId' });
        }
        if (!db.objectStoreNames.contains(STORE_CATALOG)) {
          db.createObjectStore(STORE_CATALOG, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function idbSet(storeName: string, record: Record<string, unknown>): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(storeName: string, key: string | number): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export interface CachedSchedule {
  userId: string;
  updatedAt: number;
  selections: Record<string, string>;
  events: { id: string; title: string; start: string; end: string }[];
}

export async function cacheSchedule(schedule: CachedSchedule): Promise<void> {
  await idbSet(STORE_SCHEDULE, { ...schedule, updatedAt: Date.now() });
}

export async function getCachedSchedule(userId: string): Promise<CachedSchedule | undefined> {
  return idbGet<CachedSchedule>(STORE_SCHEDULE, userId);
}

export interface CachedProfessorRating {
  professorId: string;
  updatedAt: number;
  ratings: unknown[];
  summary: { averageRating: number; averageDifficulty: number; reviewCount: number };
}

export async function cacheProfessorRating(rating: CachedProfessorRating): Promise<void> {
  await idbSet(STORE_PROFESSORS, { ...rating, updatedAt: Date.now() });
}

export async function getCachedProfessorRating(
  professorId: string,
): Promise<CachedProfessorRating | undefined> {
  return idbGet<CachedProfessorRating>(STORE_PROFESSORS, professorId);
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}
