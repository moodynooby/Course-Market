import { describe, it, expect } from 'vitest';
import { formatTime, hasTimeConflict, calculateScheduleScore } from './schedule';
import type { Schedule, Preferences, Section } from '../types';
import { makeTimeSlot, makeSection, basePreferences } from '../test/performance-helpers';

const makeSchedule = (sections: Section[], totalCredits: number): Schedule => ({
  id: 'sched',
  name: 'Test',
  sections,
  totalCredits,
  score: 0,
  conflicts: [],
});

describe('formatTime', () => {
  it('formats morning times correctly', () => {
    expect(formatTime('09:15')).toBe('9:15 AM');
  });

  it('formats afternoon times correctly', () => {
    expect(formatTime('13:30')).toBe('1:30 PM');
  });
});

describe('hasTimeConflict', () => {
  it('detects conflicts on same day with overlapping times', () => {
    const a = makeTimeSlot('M', '10:00', '11:00');
    const b = makeTimeSlot('M', '10:30', '11:30');
    expect(hasTimeConflict(a, b)).toBe(true);
  });

  it('does not report conflict on different days', () => {
    const a = makeTimeSlot('M', '10:00', '11:00');
    const b = makeTimeSlot('T', '10:00', '11:00');
    expect(hasTimeConflict(a, b)).toBe(false);
  });
});

describe('calculateScheduleScore', () => {
  it('penalizes schedules outside credit range', () => {
    const prefs = { ...basePreferences, minCredits: 12, maxCredits: 18 };
    const low = calculateScheduleScore(makeSchedule([], 9), prefs);
    const high = calculateScheduleScore(makeSchedule([], 21), prefs);
    expect(low).toBeLessThan(100);
    expect(high).toBeLessThan(100);
  });

  it('penalizes days the user wants to avoid', () => {
    const section = makeSection({
      timeSlots: [makeTimeSlot('F', '10:00', '11:00')],
      instructor: 'Test',
    });
    const prefs = { ...basePreferences, avoidDays: ['F'] } as Preferences;
    const score = calculateScheduleScore(makeSchedule([section], 15), prefs);
    expect(score).toBeLessThan(100);
  });
});
