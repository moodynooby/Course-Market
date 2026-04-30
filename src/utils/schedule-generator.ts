import type { Course, Preferences, Schedule, Section } from '../types';
import { calculateScheduleScore, hasSectionConflict, timeToMinutesCached } from './schedule';
import type { GeneratedSchedule, GeneratorOptions, ScheduleCluster } from './schedule-types';

function* generateValidCombinations(
  arrays: Section[][],
  current: Section[] = [],
  index: number = 0,
): Generator<Section[]> {
  if (index === arrays.length) {
    yield [...current]; // Clone current when yielding a full combination
    return;
  }

  const first = arrays[index];
  for (let i = 0; i < first.length; i++) {
    const section = first[i];
    // Prune: check if the current section conflicts with any already selected sections
    let hasConflict = false;
    for (let j = 0; j < current.length; j++) {
      if (hasSectionConflict(section, current[j])) {
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      current.push(section);
      yield* generateValidCombinations(arrays, current, index + 1);
      current.pop();
    }
  }
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

  // Pre-calculate total credits for the selected courses
  const totalCredits = Array.from(sectionsByCourse.keys()).reduce((sum, courseId) => {
    const course = courses.find((c) => c.id === courseId);
    return sum + (course?.credits || 0);
  }, 0);

  // Get credit bounds from preferences
  const minCredits = preferences.minCredits || 12;
  const maxCredits = preferences.maxCredits || 18;

  // Early exit if total credits are out of bounds
  if (totalCredits < minCredits || totalCredits > maxCredits) {
    return [];
  }

  // Pre-calculate scoring context to avoid redundant work in the loop
  const scoringContext = {
    avoidDaysSet: new Set(preferences.avoidDays),
    excludeInstructorsSet: new Set(preferences.excludeInstructors),
    preferredStart: timeToMinutesCached(preferences.preferredStartTime),
    preferredEnd: timeToMinutesCached(preferences.preferredEndTime),
  };

  const sectionArrays = Array.from(sectionsByCourse.values());
  const schedules: GeneratedSchedule[] = [];
  let count = 0;
  let iterations = 0;

  for (const combination of generateValidCombinations(sectionArrays)) {
    iterations++;
    if (onProgress && iterations % 100 === 0) {
      onProgress(iterations);
    }

    if (schedules.length >= maxSchedules) break;

    const schedule: Schedule = {
      id: `gen-${count}`,
      name: `Generated Schedule ${count + 1}`,
      sections: combination,
      totalCredits,
      score: 0,
      conflicts: [],
    };

    const score = calculateScheduleScore(schedule, preferences, scoringContext);

    schedules.push({
      id: schedule.id,
      sections: combination,
      totalCredits,
      score,
      conflicts: [],
    });

    count++;
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
