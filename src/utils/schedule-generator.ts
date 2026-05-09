import type { Course, Preferences, Schedule, Section } from '../types';
import { calculateScheduleScore, createScoringContext, hasSectionConflict } from './schedule';
import type { GeneratedSchedule, GeneratorOptions, ScheduleCluster } from './schedule-types';

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

  // Pre-map courses for O(1) credit lookup
  const courseCreditsMap = new Map(courses.map((c) => [c.id, c.credits]));

  // Get credit bounds from preferences
  const minCredits = preferences.minCredits || 12;
  const maxCredits = preferences.maxCredits || 18;

  const sectionArrays = Array.from(sectionsByCourse.values());
  const schedules: GeneratedSchedule[] = [];
  let count = 0;
  let iterations = 0;

  // Optimization: Pre-compute scoring context to hoist expensive operations out of the hot loop.
  const scoringContext = createScoringContext(preferences);

  // Optimization: use manual backtracking with a shared array to minimize allocations and GC pressure.
  // This replaces the recursive generator which created many temporary arrays and generator objects.
  const currentCombination: Section[] = [];

  function backtrack(index: number, currentCredits: number) {
    if (index === sectionArrays.length) {
      iterations++;
      if (onProgress && iterations % 100 === 0) {
        onProgress(iterations);
      }

      if (currentCredits >= minCredits && currentCredits <= maxCredits) {
        const combination = [...currentCombination];
        const schedule: Schedule = {
          id: `gen-${count}`,
          name: `Generated Schedule ${count + 1}`,
          sections: combination,
          totalCredits: currentCredits,
          score: 0,
          conflicts: [],
        };

        const score = calculateScheduleScore(schedule, preferences, scoringContext);

        schedules.push({
          id: schedule.id,
          sections: combination,
          totalCredits: currentCredits,
          score,
          conflicts: [],
        });

        count++;
      }
      return;
    }

    if (schedules.length >= maxSchedules) return;

    for (const section of sectionArrays[index]) {
      // Early pruning: check credit limit
      const sectionCredits = courseCreditsMap.get(section.courseId) || 3;
      if (currentCredits + sectionCredits > maxCredits) continue;

      // Conflict check
      let hasConflict = false;
      for (const selected of currentCombination) {
        if (hasSectionConflict(section, selected)) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        currentCombination.push(section);
        backtrack(index + 1, currentCredits + sectionCredits);
        currentCombination.pop();
        if (schedules.length >= maxSchedules) break;
      }
    }
  }

  backtrack(0, 0);

  return schedules.sort((a, b) => b.score - a.score);
}

/**
 * Clusters schedules into groups based on score ranges.
 * Returns ScheduleCluster[] with representative schedules (highest score in each cluster).
 */
export function clusterSchedules(
  schedules: GeneratedSchedule[],
  nClusters: number = 5,
): ScheduleCluster[] {
  if (schedules.length === 0) {
    return [];
  }

  if (schedules.length <= nClusters) {
    return schedules.map((s) => ({
      id: `cluster-${s.id}`,
      label: `Score: ${s.score}`,
      schedules: [s],
      representative: s,
    }));
  }

  const scores = schedules.map((s) => s.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;
  const bucketSize = range / nClusters;

  const buckets: Map<number, GeneratedSchedule[]> = new Map();

  for (const schedule of schedules) {
    const bucketIndex = Math.min(
      Math.floor((schedule.score - minScore) / bucketSize),
      nClusters - 1,
    );
    const bucket = buckets.get(bucketIndex) || [];
    bucket.push(schedule);
    buckets.set(bucketIndex, bucket);
  }

  const clusters: ScheduleCluster[] = [];
  const clusterLabels = [
    'Best Match',
    'Great Option',
    'Good Option',
    'Viable Option',
    'Other Options',
  ];

  for (let i = 0; i < nClusters; i++) {
    const bucket = buckets.get(i);
    if (bucket && bucket.length > 0) {
      const sorted = [...bucket].sort((a, b) => b.score - a.score);
      const label =
        i < clusterLabels.length
          ? clusterLabels[i]
          : `Score ${Math.round(minScore + i * bucketSize)}-${Math.round(minScore + (i + 1) * bucketSize)}`;

      clusters.push({
        id: `cluster-${i}`,
        label,
        schedules: sorted,
        representative: sorted[0],
      });
    }
  }

  return clusters;
}
