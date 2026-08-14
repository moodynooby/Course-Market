import type { Course, Section } from '../types';
import { timeToMinutes } from './icsExport';

const GOOGLE_CALENDAR_TEMPLATE = 'https://calendar.google.com/calendar/render';

const DAY_TO_RRULE: Record<string, string> = {
  M: 'MO',
  T: 'TU',
  W: 'WE',
  Th: 'TH',
  F: 'FR',
  Sa: 'SA',
  Su: 'SU',
};

function toDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${d.getUTCDate()}`.padStart(2, '0');
  const h = `${d.getUTCHours()}`.padStart(2, '0');
  const min = `${d.getUTCMinutes()}`.padStart(2, '0');
  const s = `${d.getUTCSeconds()}`.padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

/**
 * Build a Google Calendar "create event" template URL for a single event
 * occurrence. Opening this URL opens Google Calendar with the details
 * pre-filled so the user can simply press Save.
 *
 * @param when - the occurrence's start Date (used as the canonical date/time)
 * @param durationMinutes - length of the class session in minutes
 * @param title - event title, e.g. "CS101 - 001"
 * @param details - optional description lines (course name, instructor)
 */
export function buildGoogleCalendarUrl(
  when: Date,
  durationMinutes: number,
  title: string,
  details?: string[],
): string {
  const start = toDateStr(when);
  const end = toDateStr(new Date(when.getTime() + durationMinutes * 60_000));
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
  });
  if (details?.length) {
    params.set('details', details.join('\n'));
  }
  params.set('trp', 'true');
  return `${GOOGLE_CALENDAR_TEMPLATE}?${params.toString()}`;
}

/**
 * Build a Google Calendar template URL for a whole recurring class schedule.
 *
 * The Google template URL supports a `recur` parameter for a single RRULE,
 * so we emit a WEEKLY rule covering the slot's BYDAYs with an UNTIL date
 * taken from the slot's end date. On mobile this opens the Google Calendar
 * app (if installed) or the mobile web UI, both of which honor the recur rule.
 */
export function buildGoogleCalendarRecurringUrl(
  firstStart: Date,
  durationMinutes: number,
  slotDays: string[],
  title: string,
  endDate?: string,
  details?: string[],
): string {
  const start = toDateStr(firstStart);
  const end = toDateStr(new Date(firstStart.getTime() + durationMinutes * 60_000));
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    trp: 'true',
  });
  const byday = slotDays
    .map((d) => DAY_TO_RRULE[d])
    .filter(Boolean)
    .join(',');
  const rruleParts = ['FREQ=WEEKLY'];
  if (byday) rruleParts.push(`BYDAY=${byday}`);
  if (endDate) {
    const endD = new Date(endDate);
    if (!Number.isNaN(endD.getTime())) {
      const y = endD.getUTCFullYear();
      const m = `${endD.getUTCMonth() + 1}`.padStart(2, '0');
      const d = `${endD.getUTCDate()}`.padStart(2, '0');
      rruleParts.push(`UNTIL=${y}${m}${d}T235959Z`);
    }
  }
  params.set('recur', `RRULE:${rruleParts.join(';')}`);
  if (details?.length) {
    params.set('details', details.join('\n'));
  }
  return `${GOOGLE_CALENDAR_TEMPLATE}?${params.toString()}`;
}

/**
 * Convenience helper: build a recurring Google Calendar URL directly from a
 * section and its weekly time slot, using the section's first active week as
 * the anchor date.
 */
export function buildGoogleCalendarUrlForSlot(
  section: Section,
  slot: (typeof section.timeSlots)[number],
  course: Course | undefined,
  firstStart: Date,
): string {
  const title = `${course?.code || 'Course'} - ${section.sectionNumber}`;
  const durationMinutes = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
  const details = [
    course?.name || '',
    section.instructor ? `Instructor: ${section.instructor}` : '',
  ].filter(Boolean);
  return buildGoogleCalendarRecurringUrl(
    firstStart,
    durationMinutes,
    [slot.day],
    title,
    slot.endDate,
    details,
  );
}

/**
 * Open the Google Calendar URL in a new tab (desktop) or same tab (mobile
 * app deep-link handling), returning the URL for callers that prefer to
 * handle navigation themselves.
 */
export function openGoogleCalendarUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
