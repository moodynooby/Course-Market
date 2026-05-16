import type { Course, DayOfWeek, Preferences, Schedule, Section } from '../types';
import { cosineSimilarity, getScheduleFeatureVector } from './embeddings';
import {
  checkConflicts,
  computeScheduleFeatures,
  DAY_ORDER,
  hasSectionConflict,
  type ScheduleFeatures,
  scoreSchedulesRelative,
  timeToMinutesCached,
} from './schedule';
import type { GeneratedSchedule, GeneratorOptions } from './schedule-types';

function* generateValidCombinations(
  arrays: Section[][],
  courseCreditsMap: Map<string, number>,
  minCredits: number,
  maxCredits: number,
  depthIndex: number = 0,
  current: Section[] = [],
  currentCredits: number = 0,
  suffixMax: number[] = [],
): Generator<Section[]> {
  if (arrays.length === 0) {
    if (currentCredits >= minCredits && currentCredits <= maxCredits) {
      yield current;
    }
    return;
  }

  if (suffixMax.length === 0) {
    suffixMax = arrays.map((_arr, i) => {
      let max = 0;
      for (let j = i; j < arrays.length; j++) {
        let maxInArr = 0;
        for (const s of arrays[j]) {
          maxInArr = Math.max(maxInArr, courseCreditsMap.get(s.courseId) ?? 3);
        }
        max += maxInArr;
      }
      return max;
    });
  }

  const [first, ...rest] = arrays;
  for (const sec of first) {
    const secCredits = courseCreditsMap.get(sec.courseId) ?? 3;
    const newCredits = currentCredits + secCredits;

    if (newCredits > maxCredits) continue;

    const remainingSuffix = depthIndex + 1 < suffixMax.length ? suffixMax[depthIndex + 1] : 0;
    if (newCredits + remainingSuffix < minCredits) continue;

    let hasConflict = false;
    for (const selected of current) {
      if (hasSectionConflict(sec, selected)) {
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      yield* generateValidCombinations(
        rest,
        courseCreditsMap,
        minCredits,
        maxCredits,
        depthIndex + 1,
        [...current, sec],
        newCredits,
        suffixMax,
      );
    }
  }
}

export function scheduleFootprint(sections: Section[]): string {
  const perCourse = sections.map((s) => {
    const slots = s.timeSlots
      .map((t) => `${t.day}@${t.startTime}-${t.endTime}`)
      .sort()
      .join('|');
    return `${s.courseId}:${slots}`;
  });
  perCourse.sort();
  return perCourse.join('#');
}

export interface ScheduleGroup {
  id: string;
  label: string;
  description: string;
  schedules: GeneratedSchedule[];
  topScore: number;
}

const SIMILARITY_THRESHOLD = 0.94;
export const REDUNDANT_VARIANT_PENALTY = 1000;

interface SeedSummary {
  days: DayOfWeek[];
  daysCount: number;
  earliestHour: number;
  latestHour: number;
  band: 'mornings' | 'afternoons' | 'evenings' | 'mixed';
  gapTier: 'tight' | 'moderate' | 'loose';
}

function totalGapMinutes(schedule: GeneratedSchedule): number {
  const byDay = new Map<DayOfWeek, { start: number; end: number }[]>();
  for (const section of schedule.sections) {
    for (const slot of section.timeSlots) {
      const list = byDay.get(slot.day) ?? [];
      list.push({
        start: timeToMinutesCached(slot.startTime),
        end: timeToMinutesCached(slot.endTime),
      });
      byDay.set(slot.day, list);
    }
  }
  let total = 0;
  for (const list of byDay.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.start - b.start);
    for (let i = 1; i < list.length; i++) {
      const gap = list[i].start - list[i - 1].end;
      if (gap > 0) total += gap;
    }
  }
  return total;
}

function summarizeSeed(schedule: GeneratedSchedule): SeedSummary {
  const daySet = new Set<DayOfWeek>();
  let earliest = 24;
  let latest = 0;
  let hasMorning = false;
  let hasAfternoon = false;
  let hasEvening = false;

  for (const section of schedule.sections) {
    for (const slot of section.timeSlots) {
      daySet.add(slot.day);
      const startHour = Number.parseInt(slot.startTime.split(':')[0], 10);
      const endHour = Number.parseInt(slot.endTime.split(':')[0], 10);
      if (startHour < earliest) earliest = startHour;
      if (endHour > latest) latest = endHour;
      if (startHour < 12) hasMorning = true;
      else if (startHour < 17) hasAfternoon = true;
      else hasEvening = true;
    }
  }

  const days = DAY_ORDER.filter((d) => daySet.has(d));
  let band: SeedSummary['band'] = 'mixed';
  if (hasMorning && !hasAfternoon && !hasEvening) band = 'mornings';
  else if (hasAfternoon && !hasMorning && !hasEvening) band = 'afternoons';
  else if (hasEvening && !hasMorning && !hasAfternoon) band = 'evenings';

  const gapMinutes = totalGapMinutes(schedule);
  let gapTier: SeedSummary['gapTier'];
  if (gapMinutes < 60) gapTier = 'tight';
  else if (gapMinutes <= 180) gapTier = 'moderate';
  else gapTier = 'loose';

  return {
    days,
    daysCount: daySet.size,
    earliestHour: earliest,
    latestHour: latest,
    band,
    gapTier,
  };
}

function dayPatternLabel(days: DayOfWeek[]): string {
  if (days.length === 0) return 'No days';
  const set = new Set(days);
  const isMWF = (set.has('M') || set.has('W') || set.has('F')) && !set.has('T') && !set.has('Th');
  const isTTh = set.has('T') && set.has('Th') && !set.has('M') && !set.has('W') && !set.has('F');
  if (isMWF) return 'MWF';
  if (isTTh) return 'TTh';
  return days.join('/');
}

function formatHour(hour: number): string {
  if (hour <= 0 || hour >= 24) return '';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function labelFromSeed(seed: SeedSummary): string {
  const dayPart = dayPatternLabel(seed.days);
  const bandPart = seed.band === 'mixed' ? '' : ` ${seed.band}`;
  const daysPart = `${seed.daysCount}-day`;
  const gapPart =
    seed.gapTier === 'tight' ? 'tight' : seed.gapTier === 'loose' ? 'spread' : 'balanced';
  return `${dayPart}${bandPart} · ${daysPart} · ${gapPart}`;
}

function describeSeed(seed: SeedSummary): string {
  const start = formatHour(seed.earliestHour);
  const end = formatHour(seed.latestHour);
  const window = start && end ? `${start}–${end}` : '';
  const days = seed.days.join(', ');
  return [days, window].filter(Boolean).join(' · ');
}

/**
 * Clusters schedules by cosine similarity over the existing 12-dim feature vector
 * (see embeddings.ts). Each schedule is assigned to exactly one cluster — greedy
 * nearest-seed assignment with a similarity threshold. Schedules are processed
 * in score-desc order so each cluster's seed is its best schedule.
 *
 * Cluster labels are derived from the seed's day pattern and time band.
 */
export function clusterSchedulesBySimilarity(schedules: GeneratedSchedule[]): ScheduleGroup[] {
  if (schedules.length === 0) return [];

  const sorted = [...schedules].sort((a, b) => b.score - a.score);

  const clusters: {
    seed: GeneratedSchedule;
    seedVec: number[];
    items: GeneratedSchedule[];
  }[] = [];

  for (const s of sorted) {
    const vec = getScheduleFeatureVector(s);
    let bestIdx = -1;
    let bestSim = SIMILARITY_THRESHOLD;
    for (let i = 0; i < clusters.length; i++) {
      const sim = cosineSimilarity(vec, clusters[i].seedVec);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) clusters[bestIdx].items.push(s);
    else clusters.push({ seed: s, seedVec: vec, items: [s] });
  }

  return clusters
    .map((c, i) => {
      const seedSummary = summarizeSeed(c.seed);
      return {
        id: `cluster-${i}`,
        label: labelFromSeed(seedSummary),
        description: describeSeed(seedSummary),
        schedules: c.items,
        topScore: c.items[0].score,
      };
    })
    .sort((a, b) => b.topScore - a.topScore);
}

/**
 * Generates all valid schedule combinations from provided courses and sections,
 * then ranks them relative to each other (best = 100, worst = 0).
 */
export function generateSchedules(
  courses: Course[],
  sectionsByCourse: Map<string, Section[]>,
  preferences: Preferences,
  options: GeneratorOptions = {},
): GeneratedSchedule[] {
  const { maxSchedules = 1000, onProgress, signal } = options;

  const courseCreditsMap = new Map(courses.map((c) => [c.id, c.credits]));

  const minCredits = preferences.minCredits ?? 12;
  const maxCredits = preferences.maxCredits ?? 18;

  const sectionArrays = Array.from(sectionsByCourse.values());

  interface Pending {
    id: string;
    sections: Section[];
    totalCredits: number;
    conflicts: string[];
    features: ScheduleFeatures;
  }
  const pending: Pending[] = [];
  let count = 0;
  let iterations = 0;

  for (const combination of generateValidCombinations(
    sectionArrays,
    courseCreditsMap,
    minCredits,
    maxCredits,
  )) {
    iterations++;
    if (signal?.aborted) break;
    if (onProgress && iterations % 100 === 0) {
      onProgress(iterations);
    }

    if (pending.length >= maxSchedules) break;

    const totalCredits = combination.reduce(
      (sum, s) => sum + (courseCreditsMap.get(s.courseId) ?? 3),
      0,
    );

    const schedule: Schedule = {
      id: `gen-${count}`,
      name: `Generated Schedule ${count + 1}`,
      sections: combination,
      totalCredits,
      score: 0,
      conflicts: [],
    };

    const features = computeScheduleFeatures(schedule, preferences);
    const conflicts = checkConflicts(combination);

    pending.push({
      id: schedule.id,
      sections: combination,
      totalCredits,
      conflicts,
      features,
    });

    count++;
  }

  const scores = scoreSchedulesRelative(
    pending.map((p) => p.features),
    preferences,
  );

  const generated: GeneratedSchedule[] = pending.map((p, i) => ({
    id: p.id,
    sections: p.sections,
    totalCredits: p.totalCredits,
    score: scores[i],
    conflicts: p.conflicts,
  }));

  // Pick one winner per footprint (highest score; ties broken by first seen).
  // Every other variant gets a large penalty so it sinks below all unique schedules.
  const winnerByFootprint = new Map<string, number>();
  const footprints: string[] = new Array(generated.length);
  for (let i = 0; i < generated.length; i++) {
    const fp = scheduleFootprint(generated[i].sections);
    footprints[i] = fp;
    const prev = winnerByFootprint.get(fp);
    if (prev === undefined || generated[i].score > generated[prev].score) {
      winnerByFootprint.set(fp, i);
    }
  }
  for (let i = 0; i < generated.length; i++) {
    if (winnerByFootprint.get(footprints[i]) !== i) {
      generated[i].score -= REDUNDANT_VARIANT_PENALTY;
    }
  }

  return generated.sort((a, b) => b.score - a.score);
}
