import { describe, it, expect } from 'vitest';
import { calculateScheduleScore } from '../utils/schedule';
import { makeSection, makeTimeSlot, basePreferences, makeSchedule } from './performance-helpers';

describe('performance', () => {
  it('schedule scoring should complete in reasonable time', () => {
    const sections = [
      makeSection({
        timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
        instructor: 'Dr. Smith',
      }),
      makeSection({
        timeSlots: [makeTimeSlot('W', '09:00', '10:00')],
        instructor: 'Dr. Jones',
      }),
      makeSection({
        timeSlots: [makeTimeSlot('F', '09:00', '10:00')],
        instructor: 'Dr. Brown',
      }),
    ];

    const schedule = makeSchedule(sections, 9);
    const start = performance.now();
    const score = calculateScheduleScore(schedule, basePreferences);
    const end = performance.now();

    expect(end - start).toBeLessThan(100);
    expect(typeof score).toBe('number');
  });
});
