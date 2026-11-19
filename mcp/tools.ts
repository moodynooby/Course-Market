import { z } from 'zod';
import type { Course, DayOfWeek, Preferences, Section } from '../src/types';
import { DEFAULT_MAX_SCHEDULES } from '../src/utils/constants';
import { generateScheduleCandidates } from '../src/utils/generation';
import { sectionsToIcs } from '../src/utils/icsExport';
import { hasSectionConflict } from '../src/utils/schedule';
import { DAY_ORDER } from '../src/utils/schedule-time';
import type { CourseDataSource, SectionPairSelection } from './types';

export const dayOfWeekSchema = z.enum(['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su']);

export const sectionPairSchema = z.object({
  courseCode: z.string().min(1).max(50).describe('Course code, e.g. "CS 101"'),
  sectionNumber: z.string().min(1).max(20).describe('Section identifier, e.g. "1" or "A"'),
});

export const listSubjectsInputShape = {
  semesterId: z.string().min(1).max(50).describe('Semester ID from list_semesters'),
};

export const searchCoursesInputShape = {
  semesterId: z.string().min(1).max(50).describe('Semester ID from list_semesters'),
  q: z
    .string()
    .max(200)
    .optional()
    .describe('Free-text query matching course code, title, description, or instructor'),
  subject: z
    .string()
    .max(50)
    .optional()
    .describe('Subject prefix filter from list_subjects (e.g. "CS", "MATH")'),
  openSeatsOnly: z
    .boolean()
    .optional()
    .describe('When true, only include courses with at least one section with open seats'),
  minCredits: z.number().min(0).max(20).optional().describe('Minimum course credits'),
  maxCredits: z.number().min(0).max(20).optional().describe('Maximum course credits'),
  includeSections: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include full section details inline (default false to keep responses compact)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe('Maximum courses to return (default 20, max 50)'),
  offset: z.number().int().min(0).optional().default(0).describe('Pagination offset (default 0)'),
};

export const getCourseDetailsInputShape = {
  semesterId: z.string().min(1).max(50).describe('Semester ID from list_semesters'),
  courseCode: z
    .string()
    .min(1)
    .max(50)
    .optional()
    .describe('Course code such as "CS 101" (case- and space-insensitive)'),
  courseId: z.string().min(1).max(255).optional().describe('Exact internal course ID'),
};

export const checkSectionConflictsInputShape = {
  semesterId: z.string().min(1).max(50).describe('Semester ID from list_semesters'),
  sectionIds: z
    .array(z.string().min(1))
    .max(30)
    .optional()
    .describe('List of section IDs to check'),
  selections: z
    .array(sectionPairSchema)
    .max(30)
    .optional()
    .describe('Alternative to sectionIds: list of { courseCode, sectionNumber } pairs'),
};

export const preferencesInputSchema = z
  .object({
    preferredStartTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Expected HH:mm format')
      .optional()
      .describe('Earliest preferred class start time in 24h HH:mm (default "08:00")'),
    preferredEndTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Expected HH:mm format')
      .optional()
      .describe('Latest preferred class end time in 24h HH:mm (default "18:00")'),
    maxGapMinutes: z
      .number()
      .int()
      .min(0)
      .max(600)
      .optional()
      .describe('Maximum preferred gap between consecutive classes in minutes (default 60)'),
    preferConsecutiveDays: z
      .boolean()
      .optional()
      .describe('Prefer classes grouped on adjacent days'),
    preferMorning: z.boolean().optional().describe('Favor morning classes'),
    preferAfternoon: z.boolean().optional().describe('Favor afternoon classes'),
    preferEvening: z.boolean().optional().describe('Favor evening classes'),
    minCredits: z.number().min(0).max(30).optional().describe('Minimum total schedule credits'),
    maxCredits: z.number().min(0).max(30).optional().describe('Maximum total schedule credits'),
    avoidDays: z
      .array(dayOfWeekSchema)
      .optional()
      .describe('Days to avoid scheduling classes on, e.g. ["F"]'),
  })
  .optional();

export const generateSchedulesInputShape = {
  semesterId: z.string().min(1).max(50).describe('Semester ID from list_semesters'),
  courseCodes: z
    .array(z.string().min(1).max(50))
    .max(15)
    .optional()
    .describe('Course codes to schedule, e.g. ["CS 101", "MATH 201"]'),
  courseIds: z
    .array(z.string().min(1).max(255))
    .max(15)
    .optional()
    .describe('Course IDs to schedule (alternative or addition to courseCodes)'),
  pinnedSections: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Map of courseCode or courseId to a pinned sectionId or sectionNumber to lock into every schedule',
    ),
  blockedInstructors: z
    .array(z.string().min(1).max(100))
    .max(30)
    .optional()
    .describe('Instructor names (or substrings) to exclude from candidate sections'),
  openSeatsOnly: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, only consider sections with open seats (except explicitly pinned sections)',
    ),
  preferences: preferencesInputSchema.describe('Optional scheduling preferences and credit bounds'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe('Maximum top-ranked schedules to return (default 5, max 20)'),
};

export const exportScheduleIcsInputShape = {
  semesterId: z.string().min(1).max(50).describe('Semester ID from list_semesters'),
  sectionIds: z.array(z.string().min(1)).max(30).optional().describe('Section IDs to export'),
  selections: z
    .array(sectionPairSchema)
    .max(30)
    .optional()
    .describe('Alternative to sectionIds: list of { courseCode, sectionNumber } pairs'),
};

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

function hasOpenSeats(section: Section): boolean {
  return section.capacity <= 0 || section.enrolled < section.capacity;
}

function seatsRemaining(section: Section): number | null {
  if (section.capacity <= 0) return null;
  return Math.max(0, section.capacity - section.enrolled);
}

function formatSectionPayload(section: Section, course?: Course) {
  return {
    id: section.id,
    courseId: section.courseId,
    courseCode: course?.code,
    courseName: course?.name,
    credits: course?.credits,
    sectionNumber: section.sectionNumber,
    instructor: section.instructor,
    capacity: section.capacity,
    enrolled: section.enrolled,
    seatsRemaining: seatsRemaining(section),
    hasOpenSeats: hasOpenSeats(section),
    timeSlots: section.timeSlots,
  };
}

async function resolveSectionsSelection(
  dataSource: CourseDataSource,
  semesterId: string,
  sectionIds?: string[],
  selections?: SectionPairSelection[],
): Promise<{ courses: Course[]; sections: Section[]; missing: string[] }> {
  const byId =
    sectionIds && sectionIds.length > 0
      ? await dataSource.getSectionsByIds(semesterId, sectionIds)
      : { courses: [], sections: [], missing: [] };

  const byPair =
    selections && selections.length > 0
      ? await dataSource.getSectionsByCourseAndNumber(semesterId, selections)
      : { courses: [], sections: [], missing: [] };

  const courseMap = new Map<string, Course>();
  for (const c of [...byId.courses, ...byPair.courses]) {
    courseMap.set(c.id, c);
  }

  const sectionMap = new Map<string, Section>();
  for (const s of [...byId.sections, ...byPair.sections]) {
    sectionMap.set(s.id, s);
  }

  return {
    courses: Array.from(courseMap.values()),
    sections: Array.from(sectionMap.values()),
    missing: [...byId.missing, ...byPair.missing],
  };
}

export async function handleListSemesters(dataSource: CourseDataSource) {
  const semesters = await dataSource.listSemesters();
  const activeSemester = semesters.find((s) => s.isActive) ?? semesters[0] ?? null;
  return {
    defaultSemesterId: activeSemester?.id ?? null,
    semesters,
  };
}

export async function handleListSubjects(
  dataSource: CourseDataSource,
  args: { semesterId: string },
) {
  const subjects = await dataSource.listSubjects(args.semesterId);
  return {
    semesterId: args.semesterId,
    totalSubjects: subjects.length,
    subjects,
  };
}

export async function handleSearchCourses(
  dataSource: CourseDataSource,
  args: {
    semesterId: string;
    q?: string;
    subject?: string;
    openSeatsOnly?: boolean;
    minCredits?: number;
    maxCredits?: number;
    includeSections?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const limit = args.limit ?? 20;
  const offset = args.offset ?? 0;
  const includeSections = args.includeSections ?? false;

  const result = await dataSource.searchCourses({
    semesterId: args.semesterId,
    q: args.q,
    subject: args.subject,
    openSeatsOnly: args.openSeatsOnly,
    minCredits: args.minCredits,
    maxCredits: args.maxCredits,
    limit,
    offset,
  });

  const sectionsByCourse = new Map<string, Section[]>();
  for (const section of result.sections) {
    const list = sectionsByCourse.get(section.courseId) ?? [];
    list.push(section);
    sectionsByCourse.set(section.courseId, list);
  }

  const courses = result.courses.map((course) => {
    const courseSections = sectionsByCourse.get(course.id) ?? [];
    const openSectionCount = courseSections.filter(hasOpenSeats).length;
    const instructors = [
      ...new Set(courseSections.map((s) => s.instructor.trim()).filter(Boolean)),
    ];

    return {
      id: course.id,
      code: course.code,
      name: course.name,
      subject: course.subject,
      credits: course.credits,
      description: course.description,
      sectionCount: courseSections.length,
      openSectionCount,
      instructors,
      ...(includeSections
        ? { sections: courseSections.map((s) => formatSectionPayload(s, course)) }
        : {}),
    };
  });

  return {
    semesterId: args.semesterId,
    total: result.total,
    limit,
    offset,
    hasMore: offset + courses.length < result.total,
    courses,
  };
}

export async function handleGetCourseDetails(
  dataSource: CourseDataSource,
  args: { semesterId: string; courseCode?: string; courseId?: string },
) {
  if (!args.courseCode?.trim() && !args.courseId?.trim()) {
    return {
      error: 'Provide either courseCode or courseId.',
    };
  }

  const details = await dataSource.getCourseDetails(args.semesterId, {
    courseCode: args.courseCode,
    courseId: args.courseId,
  });

  if (!details) {
    return {
      found: false,
      semesterId: args.semesterId,
      query: args.courseCode ?? args.courseId,
      message: 'Course not found in this semester.',
    };
  }

  return {
    found: true,
    semesterId: args.semesterId,
    course: details.course,
    sections: details.sections.map((s) => formatSectionPayload(s, details.course)),
  };
}

export async function handleCheckSectionConflicts(
  dataSource: CourseDataSource,
  args: {
    semesterId: string;
    sectionIds?: string[];
    selections?: SectionPairSelection[];
  },
) {
  const resolved = await resolveSectionsSelection(
    dataSource,
    args.semesterId,
    args.sectionIds,
    args.selections,
  );

  const courseMap = new Map(resolved.courses.map((c) => [c.id, c]));
  const conflicts: Array<{
    sectionA: { id: string; courseCode: string; sectionNumber: string };
    sectionB: { id: string; courseCode: string; sectionNumber: string };
    reason: string;
  }> = [];

  for (let i = 0; i < resolved.sections.length; i++) {
    for (let j = i + 1; j < resolved.sections.length; j++) {
      const a = resolved.sections[i];
      const b = resolved.sections[j];
      const courseA = courseMap.get(a.courseId);
      const courseB = courseMap.get(b.courseId);
      const labelA = `${courseA?.code ?? a.courseId} (${a.sectionNumber})`;
      const labelB = `${courseB?.code ?? b.courseId} (${b.sectionNumber})`;

      if (a.courseId === b.courseId) {
        conflicts.push({
          sectionA: {
            id: a.id,
            courseCode: courseA?.code ?? a.courseId,
            sectionNumber: a.sectionNumber,
          },
          sectionB: {
            id: b.id,
            courseCode: courseB?.code ?? b.courseId,
            sectionNumber: b.sectionNumber,
          },
          reason: `Duplicate course selected: ${labelA} and ${labelB}`,
        });
        continue;
      }

      if (hasSectionConflict(a, b)) {
        conflicts.push({
          sectionA: {
            id: a.id,
            courseCode: courseA?.code ?? a.courseId,
            sectionNumber: a.sectionNumber,
          },
          sectionB: {
            id: b.id,
            courseCode: courseB?.code ?? b.courseId,
            sectionNumber: b.sectionNumber,
          },
          reason: `Time overlap between ${labelA} and ${labelB}`,
        });
      }
    }
  }

  const byDay: Partial<
    Record<
      DayOfWeek,
      Array<{
        courseCode: string;
        sectionNumber: string;
        startTime: string;
        endTime: string;
        instructor: string;
      }>
    >
  > = {};

  for (const section of resolved.sections) {
    const course = courseMap.get(section.courseId);
    for (const slot of section.timeSlots) {
      const entries = byDay[slot.day] ?? [];
      entries.push({
        courseCode: course?.code ?? section.courseId,
        sectionNumber: section.sectionNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        instructor: section.instructor,
      });
      byDay[slot.day] = entries;
    }
  }

  const orderedByDay: Record<
    string,
    Array<{
      courseCode: string;
      sectionNumber: string;
      startTime: string;
      endTime: string;
      instructor: string;
    }>
  > = {};
  for (const day of DAY_ORDER) {
    const entries = byDay[day];
    if (entries && entries.length > 0) {
      entries.sort((x, y) => x.startTime.localeCompare(y.startTime));
      orderedByDay[day] = entries;
    }
  }

  const uniqueCourseIds = new Set(resolved.sections.map((s) => s.courseId));
  const totalCredits = Array.from(uniqueCourseIds).reduce(
    (sum, courseId) => sum + (courseMap.get(courseId)?.credits ?? 3),
    0,
  );

  return {
    semesterId: args.semesterId,
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
    conflicts,
    totalCredits,
    sections: resolved.sections.map((s) => formatSectionPayload(s, courseMap.get(s.courseId))),
    byDay: orderedByDay,
    missing: resolved.missing,
  };
}

export async function handleGenerateSchedules(
  dataSource: CourseDataSource,
  args: {
    semesterId: string;
    courseCodes?: string[];
    courseIds?: string[];
    pinnedSections?: Record<string, string>;
    blockedInstructors?: string[];
    openSeatsOnly?: boolean;
    preferences?: Partial<Preferences>;
    maxResults?: number;
  },
) {
  const resolved = await dataSource.getCoursesByIdentifiers(args.semesterId, {
    courseCodes: args.courseCodes,
    courseIds: args.courseIds,
  });

  if (resolved.courses.length === 0) {
    return {
      semesterId: args.semesterId,
      schedules: [],
      totalGenerated: 0,
      missingCourses: resolved.missing,
      summary: null,
      diagnostics: {
        hasIssues: true,
        reasons: [
          {
            type: 'not-enough-courses',
            message: 'No matching courses found for the requested identifiers',
            detail: 'Verify course codes using search_courses before generating schedules.',
          },
        ],
        suggestions: ['Use search_courses to find valid course codes for this semester'],
        courseBreakdown: [],
      },
    };
  }

  const courseMap = new Map(resolved.courses.map((c) => [c.id, c]));
  const courseByNormalizedCode = new Map(resolved.courses.map((c) => [normalizeKey(c.code), c]));

  const sectionsByCourse = new Map<string, Section[]>();
  for (const course of resolved.courses) {
    sectionsByCourse.set(course.id, []);
  }
  for (const section of resolved.sections) {
    const list = sectionsByCourse.get(section.courseId);
    if (list) list.push(section);
  }

  // Resolve pinned sections (key may be courseId or courseCode; value may be sectionId or sectionNumber)
  const resolvedPinned = new Map<string, string>();
  const unresolvedPins: string[] = [];

  for (const [courseKey, sectionKey] of Object.entries(args.pinnedSections ?? {})) {
    const course = courseMap.get(courseKey) ?? courseByNormalizedCode.get(normalizeKey(courseKey));
    if (!course) {
      unresolvedPins.push(`${courseKey}: ${sectionKey}`);
      continue;
    }
    const candidates = sectionsByCourse.get(course.id) ?? [];
    const targetSecKey = normalizeKey(sectionKey);
    const match = candidates.find(
      (s) => s.id === sectionKey || normalizeKey(s.sectionNumber) === targetSecKey,
    );
    if (!match) {
      unresolvedPins.push(`${course.code}: ${sectionKey}`);
      continue;
    }
    resolvedPinned.set(course.id, match.id);
    sectionsByCourse.set(course.id, [match]);
  }

  const blockedTerms = (args.blockedInstructors ?? [])
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
  const openSeatsOnly = args.openSeatsOnly ?? false;

  if (blockedTerms.length > 0 || openSeatsOnly) {
    for (const [courseId, candidates] of sectionsByCourse.entries()) {
      if (resolvedPinned.has(courseId)) continue;
      const filtered = candidates.filter((section) => {
        if (openSeatsOnly && !hasOpenSeats(section)) return false;
        if (blockedTerms.length > 0) {
          const instructorLower = section.instructor.toLowerCase();
          if (blockedTerms.some((term) => instructorLower.includes(term))) {
            return false;
          }
        }
        return true;
      });
      sectionsByCourse.set(courseId, filtered);
    }
  }

  const targetCredits = resolved.courses.reduce((sum, c) => sum + (c.credits || 3), 0);
  const result = generateScheduleCandidates({
    courses: resolved.courses,
    sectionsByCourse,
    targetCredits,
    preferences: args.preferences,
    pinnedSelections: Object.fromEntries(resolvedPinned),
    clampOnlyDefaults: true,
    maxSchedules: DEFAULT_MAX_SCHEDULES,
  });

  const maxResults = args.maxResults ?? 5;
  const topSchedules = result.schedules.slice(0, maxResults).map((schedule, index) => ({
    rank: index + 1,
    id: schedule.id,
    score: schedule.score,
    totalCredits: schedule.totalCredits,
    sections: schedule.sections.map((s) => formatSectionPayload(s, courseMap.get(s.courseId))),
  }));

  return {
    semesterId: args.semesterId,
    totalGenerated: result.schedules.length,
    returnedCount: topSchedules.length,
    schedules: topSchedules,
    missingCourses: resolved.missing,
    unresolvedPins,
    appliedPreferences: result.preferences,
    summary: result.summary,
    diagnostics: result.diagnostics,
  };
}

export async function handleExportScheduleIcs(
  dataSource: CourseDataSource,
  args: {
    semesterId: string;
    sectionIds?: string[];
    selections?: SectionPairSelection[];
  },
) {
  const resolved = await resolveSectionsSelection(
    dataSource,
    args.semesterId,
    args.sectionIds,
    args.selections,
  );

  if (resolved.sections.length === 0) {
    return {
      semesterId: args.semesterId,
      ics: null,
      sectionCount: 0,
      missing: resolved.missing,
      error: 'No valid sections resolved to export.',
    };
  }

  const ics = sectionsToIcs(resolved.sections, resolved.courses);
  const courseMap = new Map(resolved.courses.map((c) => [c.id, c]));
  const uniqueCourseIds = new Set(resolved.sections.map((s) => s.courseId));
  const totalCredits = Array.from(uniqueCourseIds).reduce(
    (sum, courseId) => sum + (courseMap.get(courseId)?.credits ?? 3),
    0,
  );

  return {
    semesterId: args.semesterId,
    sectionCount: resolved.sections.length,
    totalCredits,
    missing: resolved.missing,
    ics,
  };
}
