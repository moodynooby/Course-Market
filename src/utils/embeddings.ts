import { similarity } from 'ml-distance';
import type { GeneratedSchedule } from './schedule-types';

/**
 * Get a fixed-length numeric vector representing the schedule features.
 * 12 dimensions:
 * 0: Normalized credits (0-1, assuming max 21)
 * 1: Normalized score (0-1, assuming max 100)
 * 2: Section count (normalized, assuming max 7)
 * 3: Conflict count (normalized, assuming max 5)
 * 4-8: Normalized day counts (M, T, W, Th, F)
 * 9-11: Time-of-day counts (Morning, Afternoon, Evening)
 */
export function getScheduleFeatureVector(schedule: GeneratedSchedule): number[] {
  const vector = new Array(12).fill(0);

  // Basic metrics
  vector[0] = schedule.totalCredits / 21;
  vector[1] = schedule.score / 100;
  vector[2] = schedule.sections.length / 7;
  vector[3] = Math.min(schedule.conflicts.length / 5, 1);

  // Day counts
  const days: Record<string, number> = { M: 0, T: 1, W: 2, Th: 3, F: 4 };
  const dayCounts = new Array(5).fill(0);

  // Time counts
  let morning = 0;
  let afternoon = 0;
  let evening = 0;

  for (const section of schedule.sections) {
    for (const slot of section.timeSlots) {
      if (slot.day in days) {
        dayCounts[days[slot.day]]++;
      }

      const hour = Number.parseInt(slot.startTime.split(':')[0], 10);
      if (hour < 12) morning++;
      else if (hour < 17) afternoon++;
      else evening++;
    }
  }

  // Normalize day counts (by max slots expected in a day, say 4)
  for (let i = 0; i < 5; i++) {
    vector[4 + i] = Math.min(dayCounts[i] / 4, 1);
  }

  // Normalize time counts (by total slots)
  const totalSlots = schedule.sections.reduce((acc, s) => acc + (s.timeSlots?.length || 0), 0) || 1;
  vector[9] = morning / totalSlots;
  vector[10] = afternoon / totalSlots;
  vector[11] = evening / totalSlots;

  return vector;
}

/**
 * Compute cosine similarity between two vectors
 * Uses ml-distance library for optimized computation
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }
  if (vec1.length === 0) {
    return 0;
  }
  // ml-distance similarity.cosine returns similarity (1 = identical, 0 = orthogonal)
  return similarity.cosine(vec1, vec2);
}
