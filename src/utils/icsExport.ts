import { format } from 'date-fns';

import type { Course, Section } from '../types';
import { sectionsToCalendarEvents } from './schedule';

const DAY_TO_RRULE: Record<string, string> = {
  M: 'MO',
  T: 'TU',
  W: 'WE',
  Th: 'TH',
  F: 'FR',
  Sa: 'SA',
  Su: 'SU',
};

const DAY_TO_WEEKDAY: Record<string, number> = {
  M: 1,
  T: 2,
  W: 3,
  Th: 4,
  F: 5,
  Sa: 6,
  Su: 0,
};

/** Escape text for iCalendar property values (RFC 5545 section 3.3.11). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Format a Date as an iCalendar UTC date-time value (yyyyMMddTHHmmssZ). */
export function toIcsUtc(d: Date): string {
  return format(d, "yyyyMMdd'T'HHmmss'Z'");
}

/** Parse a "HH:mm" time into total minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Build the RRULE for a weekly-recurring class event.
 *
 * Example output:
 *   FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261204T095000Z
 */
export function buildRrule(slotDays: string[], endDate?: string): string {
  const byday = slotDays
    .map((d) => DAY_TO_RRULE[d])
    .filter(Boolean)
    .join(',');
  const parts = ['FREQ=WEEKLY'];
  if (byday) parts.push(`BYDAY=${byday}`);
  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      parts.push(`UNTIL=${format(end, "yyyyMMdd'T'HHmmss'Z'")}`);
    }
  }
  return parts.join(';');
}

/**
 * Build a single VEVENT block for one weekly time slot of a section.
 *
 * The event is dated to the first actual occurrence of the slot and carries
 * an RRULE so the imported calendar creates a recurring class that stays
 * current for the whole semester instead of duplicated one-off classes.
 *
 * The DTEND is computed from the first occurrence's end, adjusted to the
 * slot's actual last occurrence date so UNTIL and the event length match.
 */
export function buildVEvent(
  section: Section,
  course: Course | undefined,
  slot: (typeof section.timeSlots)[number],
  firstStart: Date,
  lastEnd: Date,
  eventIndex: number,
): string {
  const summary = `${course?.code || 'Course'} - ${section.sectionNumber}`;
  const slotMinutes = timeToMinutes(slot.startTime);
  const durationMinutes = timeToMinutes(slot.endTime) - slotMinutes;
  const end = new Date(firstStart.getTime() + durationMinutes * 60_000);

  const descriptionParts = [
    course?.name || '',
    section.instructor ? `Instructor: ${section.instructor}` : '',
  ].filter(Boolean);
  const remaining = section.capacity - section.enrolled;
  if (Number.isFinite(remaining)) {
    descriptionParts.push(`Seats remaining: ${remaining} of ${section.capacity}`);
  }
  descriptionParts.push('Generated with AuraIsHub (aurais.netlify.app)');

  const rrule = buildRrule([slot.day], slot.endDate);

  const lines = [
    'BEGIN:VEVENT',
    `UID:${section.id}-${slot.day}-${slot.startTime}-${eventIndex}@aurais.netlify.app`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(firstStart)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    descriptionParts.length ? `DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}` : '',
    `LOCATION:${escapeIcsText('Campus (see registrar)')}`,
    slot.endDate
      ? `COMMENT:Recurring weekly until ${format(new Date(lastEnd), 'MMMM d, yyyy')}`
      : '',
    `RRULE:${rrule}`,
    'END:VEVENT',
  ];
  return lines.join('\r\n');
}

/**
 * Convert the currently selected schedule into a full iCalendar (RFC 5545)
 * document with one recurring VEVENT per weekly time slot.
 */
export function sectionsToIcs(
  sections: Section[],
  courses: Course[],
  referenceDate?: Date,
): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AuraIsHub//CourseMarket//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ].join('\r\n');

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const bodies: string[] = [];
  let eventIndex = 0;

  for (const section of sections) {
    const course = courseMap.get(section.courseId);
    const allEvents = sectionsToCalendarEvents([section], courses, referenceDate);

    for (const slot of section.timeSlots) {
      const slotEvents = allEvents.filter(
        (ev) =>
          ev.start.getDay() === DAY_TO_WEEKDAY[slot.day] &&
          ev.start.getHours() * 60 + ev.start.getMinutes() === timeToMinutes(slot.startTime),
      );
      if (slotEvents.length === 0) continue;

      // Sort chronologically so the first/last occurrences are reliable.
      slotEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
      const firstStart = slotEvents[0].start;
      const lastEvent = slotEvents[slotEvents.length - 1];
      const durationMinutes = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
      const lastEnd = new Date(lastEvent.end.getTime() + durationMinutes * 60_000);

      bodies.push(buildVEvent(section, course, slot, firstStart, lastEnd, eventIndex));
      eventIndex += 1;
    }
  }

  return `${[header, ...bodies, 'END:VCALENDAR'].join('\r\n')}\r\n`;
}

/**
 * Create a Blob from the generated ICS string for download or sharing.
 */
export function icsToBlob(ics: string): Blob {
  return new Blob([ics], { type: 'text/calendar;charset=utf-8' });
}
