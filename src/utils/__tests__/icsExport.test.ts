import { describe, expect, it } from 'vitest';

import type { Course, Section } from '../../types';
import { buildGoogleCalendarUrl, buildGoogleCalendarUrlForSlot } from '../googleCalendar';
import { escapeIcsText, sectionsToIcs, timeToMinutes } from '../icsExport';

const courses: Course[] = [
  {
    id: 'c1',
    code: 'CS101',
    name: 'Introduction to Computer Science',
    subject: 'Computer Science',
    credits: 3,
  },
];

const sections: Section[] = [
  {
    id: 's1',
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Dr. Smith',
    timeSlots: [
      { day: 'M', startTime: '09:00', endTime: '09:50' },
      { day: 'W', startTime: '09:00', endTime: '09:50' },
      { day: 'F', startTime: '09:00', endTime: '09:50' },
    ],
    capacity: 40,
    enrolled: 32,
  },
];

describe('timeToMinutes', () => {
  it('parses HH:mm strings correctly', () => {
    expect(timeToMinutes('09:00')).toBe(540);
    expect(timeToMinutes('14:30')).toBe(870);
    expect(timeToMinutes('00:00')).toBe(0);
  });
});

describe('escapeIcsText', () => {
  it('escapes backslash, comma, semicolon and newline', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
});

describe('sectionsToIcs', () => {
  it('produces a valid VCALENDAR wrapper', () => {
    const ics = sectionsToIcs(sections, courses);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//AuraIsHub//CourseMarket//EN');
  });

  it('emits one recurring VEVENT per time slot', () => {
    const ics = sectionsToIcs(sections, courses);
    const vevents = ics.match(/BEGIN:VEVENT/g) ?? [];
    expect(vevents).toHaveLength(3);
  });

  it('includes RRULE with BYDAY for each slot', () => {
    const ics = sectionsToIcs(sections, courses);
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR');
  });

  it('uses UTC Z-suffixed date-times', () => {
    const ics = sectionsToIcs(sections, courses);
    const dtstarts = ics.match(/DTSTART:[0-9TZ]+/g) ?? [];
    expect(dtstarts.length).toBeGreaterThan(0);
    for (const dt of dtstarts) {
      expect(dt).toMatch(/Z$/);
    }
  });

  it('includes summary with course code and section number', () => {
    const ics = sectionsToIcs(sections, courses);
    expect(ics).toContain('SUMMARY:CS101 - 001');
  });

  it('honors UNTIL when the slot has an end date', () => {
    const withDates: Section[] = [
      {
        ...sections[0],
        timeSlots: [
          {
            day: 'M',
            startTime: '09:00',
            endTime: '09:50',
            startDate: '2026-08-24',
            endDate: '2026-12-04',
          },
        ],
      },
    ];
    // Anchor the reference date inside the slot's active range so
    // isSlotActiveDuring includes the occurrence.
    const reference = new Date(Date.UTC(2026, 8, 1, 12, 0, 0));
    const ics = sectionsToIcs(withDates, courses, reference);
    expect(ics).toContain('UNTIL');
    expect(ics).toContain('20261204');
  });

  it('returns an empty calendar body for no sections', () => {
    const ics = sectionsToIcs([], courses);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});

describe('buildGoogleCalendarUrl', () => {
  it('builds a template URL with pre-filled title and dates', () => {
    const when = new Date(Date.UTC(2026, 7, 24, 13, 30, 0));
    const url = buildGoogleCalendarUrl(when, 90, 'CS101 - 001', [
      'Intro CS',
      'Instructor: Dr. Smith',
    ]);
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=CS101');
    expect(url).toContain('001');
    expect(url).toContain('dates=20260824T133000Z%2F20260824T150000Z');
    expect(url).toContain('trp=true');
  });
});

describe('buildGoogleCalendarUrlForSlot', () => {
  it('builds a recurring URL anchored on the given first occurrence', () => {
    const firstStart = new Date(Date.UTC(2026, 7, 24, 9, 0, 0));
    const url = buildGoogleCalendarUrlForSlot(
      sections[0],
      sections[0].timeSlots[0],
      courses[0],
      firstStart,
    );
    expect(url).toContain('recur=RRULE%3AFREQ%3DWEEKLY');
    expect(url).toContain('BYDAY%3DMO');
    expect(url).toContain('20260824T090000Z%2F20260824T095000Z');
  });

  it('adds UNTIL to the recur rule when the slot has an end date', () => {
    const slot = {
      ...sections[0].timeSlots[0],
      startDate: '2026-08-24',
      endDate: '2026-12-04',
    };
    const firstStart = new Date(Date.UTC(2026, 7, 24, 9, 0, 0));
    const url = buildGoogleCalendarUrlForSlot(sections[0], slot, courses[0], firstStart);
    expect(url).toContain('UNTIL');
    expect(url).toContain('20261204');
  });
});
