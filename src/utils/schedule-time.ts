import type { DayOfWeek } from '../types';
import { AFTERNOON_END_MINUTES, MORNING_END_MINUTES } from './constants';

export const DAY_ORDER: DayOfWeek[] = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

export const DAY_INDEX: Record<DayOfWeek, number> = {
  M: 0,
  T: 1,
  W: 2,
  Th: 3,
  F: 4,
  Sa: 5,
  Su: 6,
};

export const DAY_TO_RRULE: Record<string, string> = {
  M: 'MO',
  T: 'TU',
  W: 'WE',
  Th: 'TH',
  F: 'FR',
  Sa: 'SA',
  Su: 'SU',
};

export const DAY_TO_WEEKDAY: Record<string, number> = {
  M: 1,
  T: 2,
  W: 3,
  Th: 4,
  F: 5,
  Sa: 6,
  Su: 0,
};

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

const timeCache = new Map<string, number>();
const MAX_CACHE_SIZE = 100;
const cacheKeys: string[] = [];

export function timeToMinutesCached(time: string): number {
  let minutes = timeCache.get(time);
  if (minutes === undefined) {
    minutes = timeToMinutes(time);
    if (timeCache.size >= MAX_CACHE_SIZE) {
      const oldest = cacheKeys.shift();
      if (oldest) timeCache.delete(oldest);
    }
    timeCache.set(time, minutes);
    cacheKeys.push(time);
  }
  return minutes;
}

export type TimeBand = 'morning' | 'afternoon' | 'evening';

export function getTimeBand(startMinutes: number): TimeBand {
  if (startMinutes < MORNING_END_MINUTES) return 'morning';
  if (startMinutes < AFTERNOON_END_MINUTES) return 'afternoon';
  return 'evening';
}
