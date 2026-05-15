import { describe, expect, it } from 'vitest';
import { calculateScheduleScore } from '../utils/schedule';
import { basePreferences, makeSchedule, makeSection, makeTimeSlot } from './performance-helpers';

describe('benchmark', () => {
  it('should score a simple schedule in under 50ms', () => {
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
    calculateScheduleScore(schedule, basePreferences);
    const end = performance.now();

    expect(end - start).toBeLessThan(50);
  });

  it('should handle large schedules under 5ms avg', () => {
    const days: import('../types').DayOfWeek[] = ['M', 'W', 'F'];
    const sections = Array.from({ length: 6 }, (_, i) =>
      makeSection({
        id: `s${i}`,
        timeSlots: [makeTimeSlot(days[i % 3], `${9 + i}:00`, `${10 + i}:00`)],
        instructor: `Dr. ${i}`,
      }),
    );

    const schedule = makeSchedule(sections, 18);
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      calculateScheduleScore(schedule, basePreferences);
    }
    const end = performance.now();

    const avgTime = (end - start) / iterations;
    expect(avgTime).toBeLessThan(5);
  });
});
