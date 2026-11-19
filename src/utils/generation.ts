import type { Course, Preferences, Schedule, Section } from '../types';
import { DEFAULT_MAX_SCHEDULES, DEFAULT_PREFERENCES } from './constants';
import type { ScheduleDiagnostics } from './schedule-diagnostics';
import { diagnoseEmptyGeneration } from './schedule-diagnostics';
import { generateSchedules } from './schedule-generator';
import type { PrefilterSummary } from './schedule-prefilter';
import { buildSectionsByCourse, prefilterSections } from './schedule-prefilter';

export interface GenerateScheduleRequest {
  courses: Course[];
  /** Raw semester sections. Required unless `sectionsByCourse` is provided. */
  sections?: Section[];
  /** Sections currently selected, used to scope generation and clamp credits. */
  scheduleSections?: Section[];
  pinnedSelections?: Record<string, string>;
  /** An already-resolved section map, for callers that apply their own filters. */
  sectionsByCourse?: Map<string, Section[]>;
  /** Credit target for the `sectionsByCourse` path. */
  targetCredits?: number;
  preferences?: Partial<Preferences>;
  /** Clamp minCredits down to the computed target. Defaults to true. */
  clampMinCredits?: boolean;
  /** Clamp maxCredits up to the computed target. Defaults to true. */
  clampMaxCredits?: boolean;
  /** Only clamp fields the caller omitted. Defaults to false. */
  clampOnlyDefaults?: boolean;
  maxSchedules?: number;
  onProgress?: (count: number) => void;
}

export interface GenerateScheduleResult {
  schedules: Schedule[];
  summary: PrefilterSummary | null;
  diagnostics: ScheduleDiagnostics | null;
  preferences: Preferences;
}

/**
 * Server-side generation defaults. These intentionally differ from the app's
 * interactive defaults (DEFAULT_PREFERENCES) so existing API/MCP callers keep
 * the same scores and applied preferences they had before the pipeline was shared.
 */
const GENERATION_DEFAULTS: Preferences = {
  ...DEFAULT_PREFERENCES,
  preferredEndTime: '18:00',
  preferConsecutiveDays: false,
};

function normalizePreferences(raw: Partial<Preferences> | undefined): {
  preferences: Preferences;
  hasExplicitMin: boolean;
  hasExplicitMax: boolean;
} {
  const hasExplicitMin = typeof raw?.minCredits === 'number';
  const hasExplicitMax = typeof raw?.maxCredits === 'number';
  const merged = { ...GENERATION_DEFAULTS, ...raw };
  return {
    preferences: {
      ...merged,
      avoidDays: Array.isArray(raw?.avoidDays) ? raw.avoidDays : GENERATION_DEFAULTS.avoidDays,
      preferredStartTime:
        typeof raw?.preferredStartTime === 'string' && raw.preferredStartTime
          ? raw.preferredStartTime
          : GENERATION_DEFAULTS.preferredStartTime,
      preferredEndTime:
        typeof raw?.preferredEndTime === 'string' && raw.preferredEndTime
          ? raw.preferredEndTime
          : GENERATION_DEFAULTS.preferredEndTime,
      minCredits:
        typeof raw?.minCredits === 'number' ? raw.minCredits : GENERATION_DEFAULTS.minCredits,
      maxCredits:
        typeof raw?.maxCredits === 'number' ? raw.maxCredits : GENERATION_DEFAULTS.maxCredits,
    },
    hasExplicitMin,
    hasExplicitMax,
  };
}

/**
 * The single generation pipeline used by the server endpoint, the client
 * fallback and the courses MCP tool. Keeping the ordering here is what makes
 * scores, section membership and diagnostics identical at every entry point.
 */
export function generateScheduleCandidates(
  request: GenerateScheduleRequest,
): GenerateScheduleResult {
  const pinnedSelections = request.pinnedSelections ?? {};
  const { preferences, hasExplicitMin, hasExplicitMax } = normalizePreferences(request.preferences);

  const targetSections = request.scheduleSections?.length
    ? request.scheduleSections
    : (request.sections ?? []);
  const targetCourseIds = new Set(targetSections.map((section) => section.courseId));
  const credits =
    request.targetCredits ??
    request.courses
      .filter((course) => targetCourseIds.has(course.id))
      .reduce((sum, course) => sum + (course.credits || 3), 0);

  const defaultsOnly = request.clampOnlyDefaults ?? false;
  if (credits > 0) {
    if ((request.clampMinCredits ?? true) && (!defaultsOnly || !hasExplicitMin)) {
      preferences.minCredits = Math.min(preferences.minCredits, credits);
    }
    if ((request.clampMaxCredits ?? true) && (!defaultsOnly || !hasExplicitMax)) {
      preferences.maxCredits = Math.max(preferences.maxCredits, credits);
    }
  }

  const sectionsByCourse =
    request.sectionsByCourse ??
    buildSectionsByCourse(targetSections, request.sections ?? [], pinnedSelections);
  if (sectionsByCourse.size === 0) {
    return { schedules: [], summary: null, diagnostics: null, preferences };
  }

  const courseCodeMap = new Map(request.courses.map((course) => [course.id, course.code]));
  const { sectionsByCourse: filtered, summary } = prefilterSections(
    sectionsByCourse,
    preferences,
    courseCodeMap,
  );

  const schedules = generateSchedules(request.courses, filtered, preferences, {
    maxSchedules: request.maxSchedules ?? DEFAULT_MAX_SCHEDULES,
    onProgress: request.onProgress,
  });

  const diagnostics = schedules.length
    ? null
    : diagnoseEmptyGeneration(
        request.courses,
        sectionsByCourse,
        preferences,
        new Map(Object.entries(pinnedSelections)),
      );

  return { schedules, summary, diagnostics, preferences };
}
