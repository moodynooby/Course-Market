import type { Course, Preferences, Schedule, Section } from '../types';
import { calculateScheduleScore, createScoringContext, hasSectionConflict } from './schedule';
import type { GeneratedSchedule, GeneratorOptions, ScheduleCluster } from './schedule-types';

/**
 * Generates all valid schedule combinations from provided courses and sections.
 * Optimized to use an index-based backtracking approach with early pruning.
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
  const scoringContext = createScoringContext(preferences);

  let iterations = 0;
  const currentSections: Section[] = [];

  function backtrack(arrayIndex: number, currentCredits: number) {
    if (schedules.length >= maxSchedules) return;

    if (arrayIndex === sectionArrays.length) {
      iterations++;
      if (onProgress && iterations % 100 === 0) {
        onProgress(iterations);
      }

      if (currentCredits >= minCredits && currentCredits <= maxCredits) {
        const combination = [...currentSections];
        const schedule: Schedule = {
          id: `gen-${schedules.length}`,
          name: `Generated Schedule ${schedules.length + 1}`,
          sections: combination,
          totalCredits: currentCredits,
          score: 0,
          conflicts: [],
        };

        const score = calculateScheduleScore(schedule, scoringContext);

        schedules.push({
          id: schedule.id,
          sections: combination,
          totalCredits: currentCredits,
          score,
          conflicts: [],
        });
      }
      return;
    }

    const sections = sectionArrays[arrayIndex];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionCredits = courseCreditsMap.get(section.courseId) || 3;

      // Early pruning: check credit limit
      if (currentCredits + sectionCredits > maxCredits) continue;

      // Check for conflicts with already selected sections
      let hasConflict = false;
      for (let j = 0; j < currentSections.length; j++) {
        if (hasSectionConflict(section, currentSections[j])) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        currentSections.push(section);
        backtrack(arrayIndex + 1, currentCredits + sectionCredits);
        currentSections.pop();
        if (schedules.length >= maxSchedules) return;
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
