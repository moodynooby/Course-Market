import type { Course, Preferences, Schedule, Section } from '../types';
import { calculateScheduleScore, checkConflicts } from './schedule';
import type { GeneratedSchedule, GeneratorOptions, ScheduleCluster } from './schedule-types';

function* generateCombinations<T>(arrays: T[][], current: T[] = []): Generator<T[]> {
  if (arrays.length === 0) {
    yield current;
    return;
  }

  const [first, ...rest] = arrays;
  for (const item of first) {
    yield* generateCombinations(rest, [...current, item]);
  }
}

function calculateTotalCredits(sections: Section[], courses: Course[]): number {
  return sections.reduce((sum, section) => {
    const course = courses.find((c) => c.id === section.courseId);
    return sum + (course?.credits || 3);
  }, 0);
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

  // Get credit bounds from preferences
  const minCredits = preferences.minCredits || 12;
  const maxCredits = preferences.maxCredits || 18;

  const sectionArrays = Array.from(sectionsByCourse.values());
  const schedules: GeneratedSchedule[] = [];
  let count = 0;

  for (const combination of generateCombinations(sectionArrays)) {
    if (schedules.length >= maxSchedules) break;

    const conflicts = checkConflicts(combination);
    if (conflicts.length > 0) continue;

    const totalCredits = calculateTotalCredits(combination, courses);
    if (totalCredits < minCredits || totalCredits > maxCredits) continue;

    const schedule: Schedule = {
      id: `gen-${count}`,
      name: `Generated Schedule ${count + 1}`,
      sections: combination,
      totalCredits,
      score: 0,
      conflicts: [],
    };

    const score = calculateScheduleScore(schedule, preferences);

    schedules.push({
      id: schedule.id,
      sections: combination,
      totalCredits,
      score,
      conflicts,
    });

    count++;
    if (onProgress && count % 100 === 0) {
      onProgress(count);
    }
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
      // Sort by score descending and pick the first as representative
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
