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
  let iterations = 0;

  const currentCombination: Section[] = [];

  function backtrack(index: number, currentCredits: number) {
    if (schedules.length >= maxSchedules) return;

    // Prune if current credits already exceed maxCredits
    if (currentCredits > maxCredits) return;

    if (index === sectionArrays.length) {
      iterations++;
      if (onProgress && iterations % 100 === 0) {
        onProgress(iterations);
      }

      if (currentCredits >= minCredits) {
        schedules.push({
          id: `gen-${schedules.length}`,
          sections: [...currentCombination],
          totalCredits: currentCredits,
          score: 0, // Placeholder
          conflicts: [],
        });
      }
      return;
    }

    const sections = sectionArrays[index];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      let hasConflict = false;
      for (let j = 0; j < currentCombination.length; j++) {
        if (hasSectionConflict(section, currentCombination[j])) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        const sectionCredits = courseCreditsMap.get(section.courseId) || 3;
        currentCombination.push(section);
        backtrack(index + 1, currentCredits + sectionCredits);
        currentCombination.pop();
        if (schedules.length >= maxSchedules) return;
      }
    }
  }

  backtrack(0, 0);

  // Pre-create scoring context for optimization
  const scoringContext = createScoringContext(preferences);

  // Calculate scores for generated schedules
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    const internalSchedule: Schedule = {
      ...schedule,
      name: `Generated Schedule ${schedule.id}`,
    };
    schedule.score = calculateScheduleScore(internalSchedule, preferences, scoringContext);
  }

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

  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
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
