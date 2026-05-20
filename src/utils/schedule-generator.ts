import type { Course, DayOfWeek, Preferences, Schedule, Section } from '../types';
import { cosineSimilarity, getScheduleFeatureVector } from './embeddings';
import {
  checkConflicts,
  computeScheduleFeaturesWithContext,
  createScoringContext,
  DAY_ORDER,
  hasSectionConflict,
  type ScheduleFeatures,
  scoreSchedulesRelative,
  timeToMinutesCached,
} from './schedule';
import type { GeneratedSchedule, GeneratorOptions } from './schedule-types';

interface GenerationContext {
  courseCreditsMap: Map<string, number>;
  minCredits: number;
  maxCredits: number;
  maxSchedules: number;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  suffixMax: number[];
  scoringContext: ReturnType<typeof createScoringContext>;
}

function backtrackSchedules(
  arrays: Section[][],
  depth: number,
  current: Section[],
  currentCredits: number,
  genContext: GenerationContext,
  results: PendingSchedule[],
) {
  if (results.length >= genContext.maxSchedules || genContext.signal?.aborted) {
    return;
  }

  if (depth === arrays.length) {
    if (currentCredits >= genContext.minCredits && currentCredits <= genContext.maxCredits) {
      const combination = [...current];
      const schedule: Schedule = {
        id: `gen-${results.length}`,
        name: `Generated Schedule ${results.length + 1}`,
        sections: combination,
        totalCredits: currentCredits,
        score: 0,
        conflicts: [],
      };

      results.push({
        id: schedule.id,
        sections: combination,
        totalCredits: currentCredits,
        conflicts: checkConflicts(combination),
        features: computeScheduleFeaturesWithContext(schedule, genContext.scoringContext),
      });

      if (genContext.onProgress && results.length % 100 === 0) {
        genContext.onProgress(results.length);
      }
    }
    return;
  }

  const sections = arrays[depth];
  const remainingSuffix =
    depth + 1 < genContext.suffixMax.length ? genContext.suffixMax[depth + 1] : 0;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const secCredits = genContext.courseCreditsMap.get(sec.courseId) ?? 3;
    const newCredits = currentCredits + secCredits;

    if (newCredits > genContext.maxCredits) continue;
    if (newCredits + remainingSuffix < genContext.minCredits) continue;

    let hasConflict = false;
    for (let j = 0; j < current.length; j++) {
      if (hasSectionConflict(sec, current[j])) {
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      current.push(sec);
      backtrackSchedules(arrays, depth + 1, current, newCredits, genContext, results);
      current.pop();
      if (results.length >= genContext.maxSchedules || genContext.signal?.aborted) return;
    }
  }
}

interface PendingSchedule {
  id: string;
  sections: Section[];
  totalCredits: number;
  conflicts: string[];
  features: ScheduleFeatures;
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
  band: 'morning' | 'afternoon' | 'evening' | 'mixed';
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
  if (hasMorning && !hasAfternoon && !hasEvening) band = 'morning';
  else if (hasAfternoon && !hasMorning && !hasEvening) band = 'afternoon';
  else if (hasEvening && !hasMorning && !hasAfternoon) band = 'evening';

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

  // Pre-calculate suffixMax for credit limit pruning
  const suffixMax = new Array(sectionArrays.length).fill(0);
  let currentMaxSum = 0;
  for (let i = sectionArrays.length - 1; i >= 0; i--) {
    let maxInArr = 0;
    for (const s of sectionArrays[i]) {
      maxInArr = Math.max(maxInArr, courseCreditsMap.get(s.courseId) ?? 3);
    }
    currentMaxSum += maxInArr;
    suffixMax[i] = currentMaxSum;
  }

  const genContext: GenerationContext = {
    courseCreditsMap,
    minCredits,
    maxCredits,
    maxSchedules,
    onProgress,
    signal,
    suffixMax,
    scoringContext: createScoringContext(preferences),
  };

  const pending: PendingSchedule[] = [];
  backtrackSchedules(sectionArrays, 0, [], 0, genContext, pending);

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
