import { scheduleGenerateSchema } from '../../db/validation';
import type { Course, Preferences, Section } from '../../src/types';
import { generateScheduleCandidates } from '../../src/utils/generation';
import { parseJsonBody } from './lib/request';
import { jsonResponse } from './lib/response';
import { withCors } from './lib/wrap';

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

  const parsed = parseJsonBody(body, scheduleGenerateSchema);
  if ('error' in parsed) return parsed.error;

  const {
    courses,
    sections,
    scheduleSections,
    pinnedSelections = {},
    preferences,
    options,
  } = parsed.data;

  const result = generateScheduleCandidates({
    courses: courses as Course[],
    sections: sections as Section[],
    scheduleSections: scheduleSections as Section[] | undefined,
    pinnedSelections,
    preferences: (preferences ?? {}) as Partial<Preferences>,
    // The legacy endpoint only clamped minCredits, and only when generating
    // for a specific set of schedule sections.
    clampMinCredits: Boolean(scheduleSections && scheduleSections.length > 0),
    clampMaxCredits: false,
    maxSchedules: options?.maxSchedules,
  });

  return jsonResponse(200, {
    schedules: result.schedules,
    summary: result.summary,
    diagnostics: result.diagnostics,
  });
});
