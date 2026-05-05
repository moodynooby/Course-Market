import type { Course, Preferences, Section } from '../types';
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
  const scoringContext = createScoringContext(preferences);
  const currentCombination: Section[] = [];
  let count = 0;
  let iterations = 0;

  function backtrack(arrayIndex: number, currentCredits: number) {
    if (schedules.length >= maxSchedules) return;

    if (arrayIndex === sectionArrays.length) {
      iterations++;
      if (onProgress && iterations % 100 === 0) {
        onProgress(iterations);
      }

      if (currentCredits < minCredits) return;

      const schedule = {
        id: `gen-${count}`,
        sections: [...currentCombination],
        totalCredits: currentCredits,
        score: 0,
        conflicts: [] as string[],
      };

      schedule.score = calculateScheduleScore(schedule as any, preferences, scoringContext);
      schedules.push(schedule);
      count++;
      return;
    }

    const currentSections = sectionArrays[arrayIndex];
    for (let i = 0; i < currentSections.length; i++) {
      const section = currentSections[i];
      const credits = courseCreditsMap.get(section.courseId) || 3;

      if (currentCredits + credits > maxCredits) continue;

      let hasConflict = false;
      for (let j = 0; j < currentCombination.length; j++) {
        if (hasSectionConflict(section, currentCombination[j])) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        currentCombination.push(section);
        backtrack(arrayIndex + 1, currentCredits + credits);
        currentCombination.pop();
        if (schedules.length >= maxSchedules) return;
      }
    }
  }

  if (sectionArrays.length > 0) {
    backtrack(0, 0);
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
