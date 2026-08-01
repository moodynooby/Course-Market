import type { Preferences, Section } from '../types';

export interface PrefilterReport {
  sectionsByCourse: Map<string, Section[]>;
  summary: PrefilterSummary;
}

export interface PrefilterSummary {
  avoidDayRemoved: number;
  avoidDayCourses: string[];
  dedupRemoved: number;
  dedupCourses: string[];
}

export function buildSectionsByCourse(
  scheduleSections: Section[],
  allSections: Section[],
  pinnedSelections: Record<string, string>,
): Map<string, Section[]> {
  const selectedCourseIds = new Set(scheduleSections.map((s) => s.courseId));
  const relevant = allSections.filter((s) => selectedCourseIds.has(s.courseId));
  const byCourse = new Map<string, Section[]>();
  for (const section of relevant) {
    const list = byCourse.get(section.courseId) ?? [];
    list.push(section);
    byCourse.set(section.courseId, list);
  }
  for (const [courseId, sectionId] of Object.entries(pinnedSelections)) {
    if (byCourse.has(courseId)) {
      const pinned = allSections.find((s) => s.id === sectionId);
      if (pinned) byCourse.set(courseId, [pinned]);
    }
  }
  return byCourse;
}

function deduplicateSections(sections: Section[]): Section[] {
  const byPattern = new Map<string, Section>();
  for (const s of sections) {
    const key = s.timeSlots
      .map((t) => `${t.day}-${t.startTime}-${t.endTime}`)
      .sort()
      .join('|');
    const existing = byPattern.get(key);
    if (!existing || s.enrolled < existing.enrolled) {
      byPattern.set(key, s);
    }
  }
  return Array.from(byPattern.values());
}

export function prefilterSections(
  sectionsByCourse: Map<string, Section[]>,
  preferences: Preferences,
  courseCodeMap: Map<string, string>,
): PrefilterReport {
  const result = new Map<string, Section[]>();
  let avoidDayRemoved = 0;
  const avoidDayCourseIds = new Set<string>();
  let dedupRemoved = 0;
  const dedupCourseIds = new Set<string>();

  for (const [courseId, sections] of sectionsByCourse) {
    let filtered = sections;
    let before = filtered.length;

    if (preferences.avoidDays.length > 0) {
      filtered = filtered.filter(
        (s) => !s.timeSlots.some((slot) => preferences.avoidDays.includes(slot.day)),
      );
      const removed = before - filtered.length;
      if (removed > 0) {
        avoidDayRemoved += removed;
        avoidDayCourseIds.add(courseId);
      }
      before = filtered.length;
    }

    filtered = deduplicateSections(filtered);
    const removed = before - filtered.length;
    if (removed > 0) {
      dedupRemoved += removed;
      dedupCourseIds.add(courseId);
    }

    // Never leave a course empty if it had sections originally
    if (filtered.length === 0 && sections.length > 0) {
      filtered = [sections[0]];
      // Adjust counts
      if (before === 0 && avoidDayRemoved > 0) avoidDayRemoved--;
      if (removed > 0) dedupRemoved--;
    }

    result.set(courseId, filtered);
  }

  return {
    sectionsByCourse: result,
    summary: {
      avoidDayRemoved,
      avoidDayCourses: Array.from(avoidDayCourseIds).map((id) => courseCodeMap.get(id) ?? id),
      dedupRemoved,
      dedupCourses: Array.from(dedupCourseIds).map((id) => courseCodeMap.get(id) ?? id),
    },
  };
}
