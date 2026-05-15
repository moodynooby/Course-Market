import { describe, expect, it } from 'vitest';
import type { Course, Section, TimeSlot } from '../../types';
import { formatTime, sectionsToCalendarEvents, timeToMinutesCached } from '../schedule';

function makeTimeSlot(day: import('../../types').DayOfWeek, startTime: string, endTime: string): TimeSlot {
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
  it('formats 09:00 as 9:00 AM', () => {
    expect(formatTime('09:00')).toBe('9:00 AM');
  });

  it('formats 12:00 as 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('formats 13:30 as 1:30 PM', () => {
    expect(formatTime('13:30')).toBe('1:30 PM');
  });

  it('formats 00:00 as 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('formats 23:59 as 11:59 PM', () => {
    expect(formatTime('23:59')).toBe('11:59 PM');
  });
});

describe('timeToMinutesCached', () => {
  it('converts 00:00 to 0', () => {
    expect(timeToMinutesCached('00:00')).toBe(0);
  });

  it('converts 01:30 to 90', () => {
    expect(timeToMinutesCached('01:30')).toBe(90);
  });

  it('converts 12:00 to 720', () => {
    expect(timeToMinutesCached('12:00')).toBe(720);
  });

  it('converts 23:59 to 1439', () => {
    expect(timeToMinutesCached('23:59')).toBe(1439);
  });

  it('returns cached result on repeated calls', () => {
    const first = timeToMinutesCached('09:15');
    const second = timeToMinutesCached('09:15');
    expect(first).toBe(second);
  });
});

describe('sectionsToCalendarEvents', () => {
  it('returns empty array for no sections', () => {
    expect(sectionsToCalendarEvents([], [])).toEqual([]);
  });

  it('creates one event per time slot', () => {
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

  it('creates multiple events for multiple time slots', () => {
    const section = makeSection({
      timeSlots: [
        makeTimeSlot('M', '09:00', '10:00'),
        makeTimeSlot('W', '09:00', '10:00'),
      ],
    });

    const events = sectionsToCalendarEvents([section], []);

    expect(events).toHaveLength(2);
  });

  it('handles section without matching course', () => {
    const section = makeSection({
      courseId: 'nonexistent',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });

    const events = sectionsToCalendarEvents([section], []);

    expect(events).toHaveLength(1);
    expect(events[0].title).toContain('Course');
  });
});
