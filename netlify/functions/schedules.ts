import { ZodError } from 'zod';
import { formatZodError, scheduleGenerateSchema } from '../../db/validation';
import type { Course, Preferences, Section } from '../../src/types';
import { diagnoseEmptyGeneration } from '../../src/utils/schedule-diagnostics';
import { generateSchedules } from '../../src/utils/schedule-generator';
import { buildSectionsByCourse, prefilterSections } from '../../src/utils/schedule-prefilter';
import { DEFAULT_MAX_SCHEDULES } from '../../src/utils/schedule-types';
import { jsonResponse } from './lib/response';
import { withCors } from './lib/wrap';

const DEFAULT_PREFS: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '18:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: false,
  preferMorning: false,
  preferAfternoon: false,
  minCredits: 12,
  maxCredits: 18,
  avoidDays: [],
};

export const handler = withCors(async (event) => {
  const { httpMethod, path, body } = event;

  if (httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  if (
    !path.endsWith('/schedules') &&
    !path.endsWith('/schedules/generate') &&
    !path.endsWith('/generate')
  ) {
    return jsonResponse(404, { error: 'Not Found' });
  }

  let parsed: ReturnType<typeof scheduleGenerateSchema.parse>;
  try {
    parsed = scheduleGenerateSchema.parse(body ? JSON.parse(body) : {});
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonResponse(400, formatZodError(e));
    }
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const {
    courses,
    sections,
    scheduleSections,
    pinnedSelections = {},
    preferences,
    options,
  } = parsed;

  const typedCourses = courses as Course[];
  const typedSections = sections as Section[];
  const rawPrefs = (preferences ?? {}) as Partial<Preferences>;

  const typedPrefs: Preferences = {
    ...DEFAULT_PREFS,
    ...rawPrefs,
    avoidDays: Array.isArray(rawPrefs.avoidDays) ? rawPrefs.avoidDays : [],
    preferredStartTime: rawPrefs.preferredStartTime || DEFAULT_PREFS.preferredStartTime,
    preferredEndTime: rawPrefs.preferredEndTime || DEFAULT_PREFS.preferredEndTime,
    minCredits:
      typeof rawPrefs.minCredits === 'number' ? rawPrefs.minCredits : DEFAULT_PREFS.minCredits,
    maxCredits:
      typeof rawPrefs.maxCredits === 'number' ? rawPrefs.maxCredits : DEFAULT_PREFS.maxCredits,
  };

  let sectionsByCourse: Map<string, Section[]>;
  if (scheduleSections && scheduleSections.length > 0) {
    sectionsByCourse = buildSectionsByCourse(
      scheduleSections as Section[],
      typedSections,
      pinnedSelections,
    );
  } else {
    sectionsByCourse = new Map<string, Section[]>();
    for (const section of typedSections) {
      const list = sectionsByCourse.get(section.courseId) ?? [];
      list.push(section);
      sectionsByCourse.set(section.courseId, list);
    }
    for (const [courseId, sectionId] of Object.entries(pinnedSelections)) {
      if (sectionsByCourse.has(courseId)) {
        const pinned = typedSections.find((s) => s.id === sectionId);
        if (pinned) sectionsByCourse.set(courseId, [pinned]);
      }
    }
  }

  if (sectionsByCourse.size === 0) {
    return jsonResponse(200, {
      schedules: [],
      summary: null,
      diagnostics: null,
    });
  }

  const courseCodeMap = new Map(typedCourses.map((c) => [c.id, c.code]));
  const { sectionsByCourse: filteredByCourse, summary } = prefilterSections(
    sectionsByCourse,
    typedPrefs,
    courseCodeMap,
  );

  const maxSchedules = options?.maxSchedules ?? DEFAULT_MAX_SCHEDULES;
  const schedules = generateSchedules(typedCourses, filteredByCourse, typedPrefs, {
    maxSchedules,
  });

  let diagnostics = null;
  if (schedules.length === 0) {
    diagnostics = diagnoseEmptyGeneration(
      typedCourses,
      sectionsByCourse,
      typedPrefs,
      new Map(Object.entries(pinnedSelections)),
    );
  }

  return jsonResponse(200, {
    schedules,
    summary,
    diagnostics,
  });
});
