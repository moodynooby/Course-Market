import { describe, expect, it } from 'vitest';
import type { Course, Preferences, Schedule, Section, TimeSlot } from '../../types';
import {
  computeScheduleFeatures,
  formatTime,
  scoreSchedulesRelative,
  sectionsToCalendarEvents,
  timeToMinutesCached,
} from '../schedule';

function makeTimeSlot(
  day: import('../../types').DayOfWeek,
  startTime: string,
  endTime: string,
): TimeSlot {
  return { day, startTime, endTime };
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
    name: id,
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
    const f = computeScheduleFeatures(scheduleWithCredits('a', 15), defaultPrefs);
    expect(scoreSchedulesRelative([f], defaultPrefs)).toEqual([100]);
  });

  it('normalizes scores from 0 to 100 relative to all candidates', () => {
    const fa = computeScheduleFeatures(scheduleWithCredits('a', 15), defaultPrefs);
    const fb = computeScheduleFeatures(scheduleWithCredits('b', 18), defaultPrefs);
    const [sa, sb] = scoreSchedulesRelative([fa, fb], defaultPrefs);
    expect(Math.max(sa, sb)).toBe(100);
    expect(Math.min(sa, sb)).toBe(0);
  });
});
