import type { Course, DayOfWeek, Preferences, Schedule, Section } from '../types';
import { calculateScheduleScore, checkConflicts, hasSectionConflict } from './schedule';
import type { GeneratedSchedule, GeneratorOptions } from './schedule-types';

function* generateValidCombinations(
  arrays: Section[][],
  courseCreditsMap: Map<string, number>,
  minCredits: number,
  maxCredits: number,
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
          maxInArr = Math.max(maxInArr, courseCreditsMap.get(s.courseId) || 3);
        }
        max += maxInArr;
      }
      return max;
    });
  }

  const depth = arrays.length;
  const remainingIdx = depth - arrays.length;

  const [first, ...rest] = arrays;
  for (const sec of first) {
    const secCredits = courseCreditsMap.get(sec.courseId) || 3;
    const newCredits = currentCredits + secCredits;

    if (newCredits > maxCredits) continue;

    if (newCredits + suffixMax[remainingIdx] - secCredits < minCredits) continue;

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
        [...current, sec],
        newCredits,
        suffixMax,
      );
    }
  }
}

export interface ScheduleGroup {
  id: string;
  label: string;
  schedules: GeneratedSchedule[];
}

/**
 * Groups schedules by structural features (day pattern, time preference, compactness).
 */
export function groupSchedulesByStructure(schedules: GeneratedSchedule[]): ScheduleGroup[] {
  if (schedules.length === 0) return [];

  const groups = new Map<string, { label: string; schedules: GeneratedSchedule[] }>();

  const getCategory = (s: GeneratedSchedule): string[] => {
    const days = new Set<DayOfWeek>();
    let hasMorning = false;
    let hasAfternoon = false;
    let hasEvening = false;
    let hasFriday = false;
    let hasWeekend = false;

    for (const section of s.sections) {
      for (const slot of section.timeSlots) {
        days.add(slot.day);
        const hour = Number.parseInt(slot.startTime.split(':')[0], 10);
        if (hour < 12) hasMorning = true;
        else if (hour < 17) hasAfternoon = true;
        else hasEvening = true;
        if (slot.day === 'F') hasFriday = true;
        if (slot.day === 'Sa' || slot.day === 'Su') hasWeekend = true;
      }
    }

    const categories: string[] = [];

    const hasMWF = days.has('M') || days.has('W') || days.has('F');
    const hasTTh = days.has('T') || days.has('Th');
    if (hasMWF && hasTTh) categories.push('mwf-tth');
    else if (hasMWF && !hasTTh) categories.push('mwf');
    else if (hasTTh && !hasMWF) categories.push('tth');

    if (days.size <= 3) categories.push('compact');
    else categories.push('spread');

    if (hasMorning && !hasAfternoon && !hasEvening) categories.push('all-morning');
    else if (hasAfternoon && !hasMorning && !hasEvening) categories.push('all-afternoon');
    else if (hasEvening && !hasMorning && !hasAfternoon) categories.push('all-evening');
    else categories.push('mixed-times');

    if (hasWeekend) categories.push('weekend');
    if (!hasFriday && !hasWeekend) categories.push('no-friday');

    return categories;
  };

  for (const schedule of schedules) {
    const cats = getCategory(schedule);
    const primary = cats[0] || 'other';

    if (!groups.has(primary)) {
      const labels: Record<string, string> = {
        mwf: 'MWF Schedules',
        tth: 'TTh Schedules',
        'mwf-tth': 'Mix (MWF + TTh)',
        compact: 'Compact (≤3 days)',
        spread: 'Spread Out (4-5 days)',
        'no-friday': 'No Friday Classes',
        weekend: 'Weekend Classes',
        'all-morning': 'All Morning',
        'all-afternoon': 'All Afternoon',
        'all-evening': 'All Evening',
        'mixed-times': 'Mixed Times',
      };
      groups.set(primary, { label: labels[primary] || primary, schedules: [] });
    }
    groups.get(primary)!.schedules.push(schedule);
  }

  const sortedGroups = Array.from(groups.entries())
    .map(([id, g]) => ({
      id,
      label: g.label,
      schedules: g.schedules.sort((a, b) => b.score - a.score),
    }))
    .sort((a, b) => b.schedules.length - a.schedules.length);

  return sortedGroups;
}

/**
 * Generates all valid schedule combinations from provided courses and sections.
 * @param courses - All available courses
 * @param sectionsByCourse - Map of courseId to available sections for that course
 * @param preferences - User preferences for scoring and filtering
 * @param options - Generation options (max schedules, progress callback)
 * @returns Array of generated schedules sorted by score (highest first)
 */
export function generateSchedules(
  courses: Course[],
  sectionsByCourse: Map<string, Section[]>,
  preferences: Preferences,
  options: GeneratorOptions = {},
): GeneratedSchedule[] {
  const { maxSchedules = 1000, onProgress } = options;

  const courseCreditsMap = new Map(courses.map((c) => [c.id, c.credits]));

  const minCredits = preferences.minCredits || 12;
  const maxCredits = preferences.maxCredits || 18;

  const sectionArrays = Array.from(sectionsByCourse.values());
  const schedules: GeneratedSchedule[] = [];
  let count = 0;
  let iterations = 0;

  for (const combination of generateValidCombinations(
    sectionArrays,
    courseCreditsMap,
    minCredits,
    maxCredits,
  )) {
    iterations++;
    if (onProgress && iterations % 100 === 0) {
      onProgress(iterations);
    }

    if (schedules.length >= maxSchedules) break;

    const totalCredits = combination.reduce((sum, s) => {
      return sum + (courseCreditsMap.get(s.courseId) || 3);
    }, 0);

    const schedule: Schedule = {
      id: `gen-${count}`,
      name: `Generated Schedule ${count + 1}`,
      sections: combination,
      totalCredits,
      score: 0,
      conflicts: [],
    };

    const score = calculateScheduleScore(schedule, preferences);
    const conflicts = checkConflicts(combination);

    schedules.push({
      id: schedule.id,
      sections: combination,
      totalCredits,
      score,
      conflicts,
    });

    count++;
  }

  return schedules.sort((a, b) => b.score - a.score);
}
