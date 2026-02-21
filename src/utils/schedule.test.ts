import { describe, it, expect } from 'vitest';
import { formatTime, hasTimeConflict, calculateScheduleScore } from './schedule';
import type { Schedule, Preferences } from '../types';

describe('schedule', () => {
  it('formats time correctly', () => {
    expect(formatTime('09:00')).toBe('9:00 AM');
    expect(formatTime('13:00')).toBe('1:00 PM');
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('detects time conflicts', () => {
    expect(
      hasTimeConflict(
        { day: 'M', startTime: '09:00', endTime: '10:00' },
        { day: 'M', startTime: '09:30', endTime: '10:30' },
      ),
    ).toBe(true);

    expect(
      hasTimeConflict(
        { day: 'M', startTime: '09:00', endTime: '10:00' },
        { day: 'T', startTime: '09:00', endTime: '10:00' },
      ),
    ).toBe(false);
  });

  it('calculates schedule scores', () => {
    const schedule: Schedule = {
      id: 'test',
      name: 'Test',
      sections: [],
      totalCredits: 15,
      score: 0,
      conflicts: [],
    };

    const prefs: Preferences = {
      preferredStartTime: '08:00',
      preferredEndTime: '17:00',
      maxGapMinutes: 60,
      preferConsecutiveDays: true,
      preferMorning: false,
      preferAfternoon: false,
      maxCredits: 18,
      minCredits: 12,
      avoidDays: [],
      excludeInstructors: [],
    };

    const score = calculateScheduleScore(schedule, prefs);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(200);
  });
});
