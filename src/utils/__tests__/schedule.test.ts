import { describe, expect, it } from 'vitest';
import type { Course, Preferences, Schedule, Section, TimeSlot } from '../../types';
import {
  checkConflicts,
  computeScheduleFeaturesWithContext,
  createScoringContext,
  formatTime,
  formatTimeSlots,
  hasSectionConflict,
  hasTimeConflict,
  isSlotActiveDuring,
  scoreSchedulesRelative,
  sectionsToCalendarEvents,
} from '../schedule';
import { timeToMinutesCached } from '../schedule-time';

function makeTimeSlot(
  day: import('../../types').DayOfWeek,
  startTime: string,
  endTime: string,
  dateRange?: Pick<TimeSlot, 'startDate' | 'endDate'>,
): TimeSlot {
  return { day, startTime, endTime, ...dateRange };
}

function makeSection(overrides: Partial<Section>): Section {
  return {
    id: 's1',
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Dr. Test',
    timeSlots: [],
    capacity: 30,
    enrolled: 0,
    ...overrides,
  };
}

function makeCourse(overrides: Partial<Course>): Course {
  return {
    id: 'c1',
    code: 'CS101',
    name: 'Intro to CS',
    subject: 'CS',
    credits: 3,
    ...overrides,
  };
}

describe('formatTime', () => {
  it('converts 24-hour to 12-hour format with AM/PM', () => {
    expect(formatTime('09:00')).toBe('9:00 AM');
    expect(formatTime('13:30')).toBe('1:30 PM');
    expect(formatTime('23:59')).toBe('11:59 PM');
  });

  it('handles noon and midnight correctly', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('00:00')).toBe('12:00 AM');
  });
});

describe('timeToMinutesCached', () => {
  it('converts time strings to minutes since midnight', () => {
    expect(timeToMinutesCached('00:00')).toBe(0);
    expect(timeToMinutesCached('01:30')).toBe(90);
    expect(timeToMinutesCached('12:00')).toBe(720);
    expect(timeToMinutesCached('23:59')).toBe(1439);
  });
});

describe('sectionsToCalendarEvents', () => {
  it('returns empty array when no sections provided', () => {
    expect(sectionsToCalendarEvents([], [])).toEqual([]);
  });

  it('creates one event per time slot with section and course metadata', () => {
    const section = makeSection({
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const course = makeCourse({});

    const events = sectionsToCalendarEvents([section], [course]);

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('CS101 - 001');
    expect(events[0].allDay).toBe(false);
    expect(events[0].resource?.section).toBe(section);
    expect(events[0].resource?.course).toBe(course);
  });

  it('creates multiple events for sections with multiple time slots', () => {
    const section = makeSection({
      timeSlots: [makeTimeSlot('M', '09:00', '10:00'), makeTimeSlot('W', '09:00', '10:00')],
    });

    const events = sectionsToCalendarEvents([section], []);

    expect(events).toHaveLength(2);
  });

  it('handles sections without matching courses', () => {
    const section = makeSection({
      courseId: 'nonexistent',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });

    const events = sectionsToCalendarEvents([section], []);

    expect(events).toHaveLength(1);
    expect(events[0].title).toContain('Course');
  });
});

const defaultPrefs: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: false,
  preferMorning: false,
  preferAfternoon: false,
  maxCredits: 18,
  minCredits: 12,
  avoidDays: [],
};

function scheduleWithCredits(id: string, totalCredits: number): Schedule {
  return {
    id,
    sections: [
      {
        id: `${id}-sec`,
        courseId: 'c1',
        sectionNumber: '001',
        instructor: '',
        timeSlots: [makeTimeSlot('M', '10:00', '11:00')],
        capacity: 30,
        enrolled: 0,
      },
    ],
    totalCredits,
    score: 0,
    conflicts: [],
  };
}

describe('scoreSchedulesRelative', () => {
  it('returns empty array for no schedules', () => {
    expect(scoreSchedulesRelative([], defaultPrefs)).toEqual([]);
  });

  it('scores single schedule as 100', () => {
    const f = computeScheduleFeaturesWithContext(
      scheduleWithCredits('a', 15),
      createScoringContext(defaultPrefs),
    );
    expect(scoreSchedulesRelative([f], defaultPrefs)).toEqual([100]);
  });

  it('normalizes scores from 0 to 100 relative to all candidates', () => {
    const context = createScoringContext(defaultPrefs);
    const fa = computeScheduleFeaturesWithContext(scheduleWithCredits('a', 15), context);
    const fb = computeScheduleFeaturesWithContext(scheduleWithCredits('b', 18), context);
    const [sa, sb] = scoreSchedulesRelative([fa, fb], defaultPrefs);
    expect(Math.max(sa, sb)).toBe(100);
    expect(Math.min(sa, sb)).toBe(0);
  });
});

describe('conflict detection', () => {
  it('detects time conflicts for overlapping slots', () => {
    const slot1 = makeTimeSlot('M', '09:00', '10:30');
    const slot2 = makeTimeSlot('M', '10:00', '11:30');

    expect(hasTimeConflict(slot1, slot2)).toBe(true);
  });

  it('does not flag conflicts for the same time on different days', () => {
    const slot1 = makeTimeSlot('M', '09:00', '10:30');
    const slot2 = makeTimeSlot('W', '09:00', '10:30');

    expect(hasTimeConflict(slot1, slot2)).toBe(false);
  });

  it('ignores time conflicts across non-overlapping date ranges', () => {
    const slot1 = makeTimeSlot('M', '09:00', '10:00', {
      startDate: '2026-01-15',
      endDate: '2026-03-07',
    });
    const slot2 = makeTimeSlot('M', '09:00', '10:00', {
      startDate: '2026-03-15',
      endDate: '2026-05-01',
    });

    expect(hasTimeConflict(slot1, slot2)).toBe(false);
  });

  it('detects time conflicts when date ranges overlap', () => {
    const slot1 = makeTimeSlot('M', '09:00', '10:00', {
      startDate: '2026-01-15',
      endDate: '2026-04-01',
    });
    const slot2 = makeTimeSlot('M', '09:00', '10:00', {
      startDate: '2026-03-01',
      endDate: '2026-05-01',
    });

    expect(hasTimeConflict(slot1, slot2)).toBe(true);
  });

  it('detects conflicts between sections with overlapping time slots', () => {
    const section1 = makeSection({
      id: 's1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:30')],
    });
    const section2 = makeSection({
      id: 's2',
      timeSlots: [makeTimeSlot('M', '10:00', '11:30')],
    });

    expect(hasSectionConflict(section1, section2)).toBe(true);
  });

  it('does not flag self-conflict when comparing a section to itself', () => {
    const section1 = makeSection({
      id: 's1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:30')],
    });

    expect(hasSectionConflict(section1, section1)).toBe(false);
    expect(hasSectionConflict(section1, { ...section1 })).toBe(false);
  });

  it('identifies all conflicting sections in a schedule and enriches with course codes', () => {
    const sections = [
      makeSection({
        id: 's1',
        courseId: 'c1',
        sectionNumber: '001',
        timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
      }),
      makeSection({
        id: 's2',
        courseId: 'c2',
        sectionNumber: '002',
        timeSlots: [makeTimeSlot('M', '09:30', '10:30')],
      }),
      makeSection({
        id: 's3',
        courseId: 'c3',
        sectionNumber: '003',
        timeSlots: [makeTimeSlot('W', '09:00', '10:00')],
      }),
    ];
    const courses: Course[] = [
      { id: 'c1', code: 'CS101', name: 'Intro CS', subject: 'CS', credits: 3 },
      { id: 'c2', code: 'MATH101', name: 'Calculus', subject: 'MATH', credits: 3 },
    ];

    const conflicts = checkConflicts(sections, courses);

    expect(conflicts.length).toBe(1);
    expect(conflicts[0]).toBe('CS101 Sec 001 and MATH101 Sec 002 conflict');
  });

  it('checks slot activity throughout the full duration of the final day', () => {
    const slot = makeTimeSlot('M', '09:00', '10:00', {
      startDate: '2026-01-15',
      endDate: '2026-03-07',
    });

    // An afternoon time on the final date should still be considered active
    const finalDayAfternoon = new Date('2026-03-07T14:30:00');
    expect(isSlotActiveDuring(slot, finalDayAfternoon)).toBe(true);

    // Day after the end date should be inactive
    const dayAfter = new Date('2026-03-08T09:00:00');
    expect(isSlotActiveDuring(slot, dayAfter)).toBe(false);
  });
});

describe('formatTimeSlots', () => {
  it('formats single time slot with day and time', () => {
    const slots = [makeTimeSlot('M', '09:00', '10:00')];
    const { dayDisplay, timeDisplay } = formatTimeSlots(slots);

    expect(dayDisplay).toBe('M');
    expect(timeDisplay).toBe('9:00 AM - 10:00 AM');
  });

  it('formats multiple days as concatenated abbreviations', () => {
    const slots = [
      makeTimeSlot('M', '09:00', '10:00'),
      makeTimeSlot('W', '09:00', '10:00'),
      makeTimeSlot('F', '09:00', '10:00'),
    ];
    const { dayDisplay, timeDisplay } = formatTimeSlots(slots);

    expect(dayDisplay).toBe('MWF');
    expect(timeDisplay).toBe('9:00 AM - 10:00 AM');
  });

  it('returns "TBA" for empty time slots', () => {
    const { dayDisplay, timeDisplay } = formatTimeSlots([]);

    expect(dayDisplay).toBe('');
    expect(timeDisplay).toBe('TBA');
  });

  it('formats afternoon times correctly with PM', () => {
    const slots = [makeTimeSlot('M', '13:00', '14:30')];
    const { timeDisplay } = formatTimeSlots(slots);

    expect(timeDisplay).toBe('1:00 PM - 2:30 PM');
  });
});
