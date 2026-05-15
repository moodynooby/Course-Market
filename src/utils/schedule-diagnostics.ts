import type { Course, Preferences, Section } from '../types';
import { hasSectionConflict } from './schedule';

export interface ScheduleDiagnostics {
  hasIssues: boolean;
  reasons: DiagnosticReason[];
  suggestions: string[];
  courseBreakdown: CourseDiagnostic[];
}

export interface DiagnosticReason {
  type:
    | 'all-conflicts'
    | 'credit-range'
    | 'not-enough-courses'
    | 'pinned-conflicts'
    | 'no-sections'
    | 'single-course';
  message: string;
  detail: string;
}

export interface CourseDiagnostic {
  courseId: string;
  courseCode: string;
  totalSections: number;
  conflictingSections: number;
  hasNonConflictingSections: boolean;
}

export function diagnoseEmptyGeneration(
  courses: Course[],
  sectionsByCourse: Map<string, Section[]>,
  preferences: Preferences,
  pinnedSections: Map<string, string>,
): ScheduleDiagnostics {
  const reasons: DiagnosticReason[] = [];
  const suggestions: string[] = [];
  const courseBreakdown: CourseDiagnostic[] = [];
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const minCredits = preferences.minCredits || 12;
  const maxCredits = preferences.maxCredits || 18;

  let totalMaxCredits = 0;
  let totalMinCredits = 0;

  for (const [courseId, sections] of sectionsByCourse) {
    const course = courseMap.get(courseId);
    const courseCode = course?.code || courseId;
    const credits = course?.credits || 3;

    if (sections.length === 0) {
      reasons.push({
        type: 'no-sections',
        message: `${courseCode} has no available sections`,
        detail: 'This course has no sections to choose from.',
      });
      suggestions.push(`Remove ${courseCode} from your selection`);
    }

    let conflictingCount = 0;
    if (sections.length > 0) {
      for (const section of sections) {
        let conflictsWithAll = true;
        for (const [otherId, otherSections] of sectionsByCourse) {
          if (otherId === courseId) continue;
          for (const other of otherSections) {
            if (!hasSectionConflict(section, other)) {
              conflictsWithAll = false;
              break;
            }
          }
          if (!conflictsWithAll) break;
        }
        if (conflictsWithAll) conflictingCount++;
      }
    }

    courseBreakdown.push({
      courseId,
      courseCode,
      totalSections: sections.length,
      conflictingSections: conflictingCount,
      hasNonConflictingSections: conflictingCount < sections.length,
    });

    totalMaxCredits += credits;
    totalMinCredits += credits;
  }

  if (sectionsByCourse.size === 0) {
    reasons.push({
      type: 'not-enough-courses',
      message: 'No courses selected',
      detail: 'Select at least one course to generate schedules.',
    });
    suggestions.push('Browse courses and select the ones you want to take');
    return { hasIssues: true, reasons, suggestions, courseBreakdown };
  }

  if (sectionsByCourse.size === 1) {
    reasons.push({
      type: 'single-course',
      message: 'Only one course selected',
      detail: 'Schedule generation needs at least two courses to find interesting combinations.',
    });
    suggestions.push('Select additional courses');
  }

  if (totalMinCredits > maxCredits) {
    reasons.push({
      type: 'credit-range',
      message: `Credit minimum (${minCredits}) exceeds what your courses can provide (${totalMinCredits})`,
      detail: `Each selected course has at least the minimum credits, totaling ${totalMinCredits}, but your max is set to ${maxCredits}.`,
    });
    suggestions.push(`Increase max credits to at least ${totalMinCredits}`);
  }

  if (totalMaxCredits < minCredits) {
    reasons.push({
      type: 'not-enough-courses',
      message: `Need ${minCredits} credits but only have ${totalMaxCredits} credits worth of courses`,
      detail: 'Add more courses to reach the minimum credit threshold.',
    });
    suggestions.push(`Select more courses to reach ${minCredits} credits`);
  }

  if (pinnedSections.size > 0) {
    const pinnedIds = new Set(pinnedSections.values());
    const pinnedSectionList = Array.from(sectionsByCourse.values())
      .flat()
      .filter((s) => pinnedIds.has(s.id));

    for (let i = 0; i < pinnedSectionList.length; i++) {
      for (let j = i + 1; j < pinnedSectionList.length; j++) {
        if (hasSectionConflict(pinnedSectionList[i], pinnedSectionList[j])) {
          const a = courseMap.get(pinnedSectionList[i].courseId);
          const b = courseMap.get(pinnedSectionList[j].courseId);
          reasons.push({
            type: 'pinned-conflicts',
            message: `Pinned sections conflict: ${a?.code || pinnedSectionList[i].courseId} and ${b?.code || pinnedSectionList[j].courseId}`,
            detail: `${pinnedSectionList[i].sectionNumber} and ${pinnedSectionList[j].sectionNumber} overlap in time.`,
          });
          suggestions.push(`Unpin one of these sections to allow alternatives`);
        }
      }
    }
  }

  if (
    !reasons.some((r) => r.type === 'credit-range') &&
    !reasons.some((r) => r.type === 'not-enough-courses') &&
    !reasons.some((r) => r.type === 'pinned-conflicts')
  ) {
    const totalCombinations = Array.from(sectionsByCourse.values()).reduce(
      (acc, s) => acc * s.length,
      1,
    );
    if (totalCombinations > 0) {
      reasons.push({
        type: 'all-conflicts',
        message: 'All possible section combinations have time conflicts',
        detail: `We tried ${totalCombinations} combination${totalCombinations > 1 ? 's' : ''}, but every one had at least one time conflict.`,
      });
      const worst = courseBreakdown
        .filter((c) => c.conflictingSections === c.totalSections && c.totalSections > 0)
        .map((c) => c.courseCode);
      if (worst.length > 0) {
        suggestions.push(
          `Try dropping ${worst.join(' or ')} — every section conflicts with other courses`,
        );
      } else {
        suggestions.push('Try deselecting one course to reduce conflicts');
      }
    }
  }

  return {
    hasIssues: reasons.length > 0,
    reasons,
    suggestions: [...new Set(suggestions)],
    courseBreakdown,
  };
}
