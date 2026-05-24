import type { Section } from '../types';
import { timeToMinutesCached } from './schedule';
import type { GeneratedSchedule } from './schedule-types';

export const CREDITS_NORMALIZATION_MAX = 21;
export const SECTIONS_NORMALIZATION_MAX = 7;
export const CONFLICTS_NORMALIZATION_MAX = 5;
export const SLOTS_PER_DAY_NORMALIZATION_MAX = 4;
/** Caps the "cost" feature mix used by the intrinsic quality proxy. */
export const QUALITY_COST_CAP = 600;

// Fixed thresholds for the *intrinsic* (preference-free) quality proxy.
// These intentionally do not read from user preferences so that feature
// vectors remain comparable across generation runs.
const INTRINSIC_WINDOW_START_MIN = 480; // 08:00
const INTRINSIC_WINDOW_END_MIN = 1080; // 18:00
const INTRINSIC_GAP_THRESHOLD_MIN = 60;
const INTRINSIC_AVOID_DAY_PENALTY = 60;
const MORNING_END_MIN = 720;
const AFTERNOON_END_MIN = 1020;

const FEATURE_VECTOR_DIMS = 12;
const DAY_INDEX: Record<string, number> = { M: 0, T: 1, W: 2, Th: 3, F: 4 };

/** Cache for schedule feature vectors to avoid redundant calculations during search/filtering. */
const vectorCache = new WeakMap<GeneratedSchedule, number[]>();
/** Cache for normalized unit vectors to accelerate cosine similarity checks. */
const unitVectorCache = new WeakMap<GeneratedSchedule, number[]>();

type SlotPos = { start: number; end: number };

interface IntrinsicAccumulator {
  outsideWindow: number;
  avoidDay: number;
  gap: number;
  totalSlots: number;
  morning: number;
  afternoon: number;
  evening: number;
  dayCounts: number[];
}

/**
 * Single-pass walk over all sections/slots. Computes the cost components used
 * by the intrinsic quality proxy AND the count/band features used by the
 * feature vector. Callers that only need a subset discard the rest.
 */
function accumulateIntrinsic(sections: Section[]): IntrinsicAccumulator {
  const slotsByDay = new Map<string, SlotPos[]>();
  let outsideWindow = 0;
  let avoidDay = 0;
  let totalSlots = 0;
  let morning = 0;
  let afternoon = 0;
  let evening = 0;
  const dayCounts = [0, 0, 0, 0, 0];

  for (const section of sections) {
    for (const slot of section.timeSlots) {
      const startMin = timeToMinutesCached(slot.startTime);
      const endMin = timeToMinutesCached(slot.endTime);
      totalSlots++;

      if (startMin < INTRINSIC_WINDOW_START_MIN) {
        outsideWindow += INTRINSIC_WINDOW_START_MIN - startMin;
      }
      if (endMin > INTRINSIC_WINDOW_END_MIN) {
        outsideWindow += endMin - INTRINSIC_WINDOW_END_MIN;
      }
      if (slot.day === 'Sa' || slot.day === 'Su') {
        avoidDay += INTRINSIC_AVOID_DAY_PENALTY;
      }

      if (startMin < MORNING_END_MIN) morning++;
      else if (startMin < AFTERNOON_END_MIN) afternoon++;
      else evening++;

      const dayIdx = DAY_INDEX[slot.day];
      if (dayIdx !== undefined) dayCounts[dayIdx]++;

      const arr = slotsByDay.get(slot.day);
      if (arr) arr.push({ start: startMin, end: endMin });
      else slotsByDay.set(slot.day, [{ start: startMin, end: endMin }]);
    }
  }

  let gap = 0;
  for (const arr of slotsByDay.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a.start - b.start);
    for (let i = 0; i < arr.length - 1; i++) {
      const g = arr[i + 1].start - arr[i].end;
      if (g > INTRINSIC_GAP_THRESHOLD_MIN) gap += g - INTRINSIC_GAP_THRESHOLD_MIN;
    }
  }

  return { outsideWindow, avoidDay, gap, totalSlots, morning, afternoon, evening, dayCounts };
}

function qualityFromCosts(acc: IntrinsicAccumulator): number {
  const cost = acc.outsideWindow + acc.avoidDay + acc.gap;
  return Math.max(0, 1 - cost / QUALITY_COST_CAP);
}

/**
 * Schedule-intrinsic quality, stable across generation runs.
 * Lower cost (window misses, avoid-day hits, gap minutes) → higher quality.
 * Returns a number in [0, 1].
 */
export function getScheduleIntrinsicQuality(schedule: GeneratedSchedule): number {
  return getScheduleFeatureVector(schedule)[1];
}

/**
 * Fixed-length numeric vector representing intrinsic schedule features.
 * 12 dimensions:
 *  0: Normalized credits (capped at CREDITS_NORMALIZATION_MAX)
 *  1: Intrinsic quality (NOT the relative score — stable across runs)
 *  2: Section count (capped at SECTIONS_NORMALIZATION_MAX)
 *  3: Conflict count (capped at CONFLICTS_NORMALIZATION_MAX)
 *  4-8: Day counts (M, T, W, Th, F), capped at SLOTS_PER_DAY_NORMALIZATION_MAX.
 *       Weekend slots (Sa/Su) are intentionally omitted from day-count dims;
 *       they already contribute to the intrinsic quality via the avoid-day cost.
 *  9-11: Time-of-day distribution (Morning, Afternoon, Evening) as fractions of total
 *
 * Note: do NOT feed relative scores into this vector — embeddings must be
 * comparable across generation runs.
 */
export function getScheduleFeatureVector(schedule: GeneratedSchedule): number[] {
  const cached = vectorCache.get(schedule);
  if (cached) return cached;

  const acc = accumulateIntrinsic(schedule.sections);
  const vector = new Array(FEATURE_VECTOR_DIMS).fill(0);

  vector[0] = Math.min(schedule.totalCredits / CREDITS_NORMALIZATION_MAX, 1);
  vector[1] = qualityFromCosts(acc);
  vector[2] = Math.min(schedule.sections.length / SECTIONS_NORMALIZATION_MAX, 1);
  vector[3] = Math.min(schedule.conflicts.length / CONFLICTS_NORMALIZATION_MAX, 1);

  for (let i = 0; i < 5; i++) {
    vector[4 + i] = Math.min(acc.dayCounts[i] / SLOTS_PER_DAY_NORMALIZATION_MAX, 1);
  }

  const denom = acc.totalSlots || 1;
  vector[9] = acc.morning / denom;
  vector[10] = acc.afternoon / denom;
  vector[11] = acc.evening / denom;

  vectorCache.set(schedule, vector);
  return vector;
}

/**
 * Returns a L2-normalized version of the feature vector, cached for performance.
 * Used for fast cosine similarity via dot product.
 */
export function getNormalizedFeatureVector(schedule: GeneratedSchedule): number[] {
  const cached = unitVectorCache.get(schedule);
  if (cached) return cached;

  const vec = getScheduleFeatureVector(schedule);
  const len = vec.length;
  let norm = 0;
  for (let i = 0; i < len; i++) norm += vec[i] * vec[i];
  const mag = Math.sqrt(norm);

  const unit = new Array(len);
  if (mag === 0) {
    unit.fill(0);
  } else {
    for (let i = 0; i < len; i++) unit[i] = vec[i] / mag;
  }

  unitVectorCache.set(schedule, unit);
  return unit;
}

/**
 * Tight dot product for pre-normalized vectors.
 */
export function dotProduct(a: number[], b: number[]): number {
  let dot = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * Inline cosine for fixed-length numeric arrays. No length check, no library
 * dispatch — kept tight because this is called O(N·K) times in the clustering
 * hot path (see clusterSchedulesBySimilarity in schedule-generator.ts).
 */
function cosineUnchecked(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }
  if (vec1.length === 0) {
    return 0;
  }
  return cosineUnchecked(vec1, vec2);
}
