import { describe, expect, it } from 'vitest';
import {
  calculateScheduleScore,
  checkConflicts,
  formatTimeSlots,
  hasSectionConflict,
  hasTimeConflict,
} from '../utils/schedule';
import { basePreferences, makeSchedule, makeSection, makeTimeSlot } from './performance-helpers';

describe('performance', () => {
  describe('schedule scoring', () => {
    it('should score a simple schedule quickly', () => {
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

      expect(end - start).toBeLessThan(50);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle large schedules efficiently', () => {
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

    it('should penalize schedules exceeding credit limits', () => {
      const sections = [
        makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('W', '09:00', '10:00')] }),
      ];

      const schedule = makeSchedule(sections, 20);
      const score = calculateScheduleScore(schedule, basePreferences);

      expect(score).toBeLessThan(80);
    });

    it('should handle avoided days correctly', () => {
      const sections = [
        makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('F', '09:00', '10:00')] }),
      ];

      const schedule = makeSchedule(sections, 6);
      const prefsWithAvoidedDays: typeof basePreferences = {
        ...basePreferences,
        avoidDays: ['M', 'F'] as unknown as typeof basePreferences.avoidDays,
      };
      const score = calculateScheduleScore(schedule, prefsWithAvoidedDays);

      expect(score).toBeLessThan(100);
    });

    it('should handle excluded instructors correctly', () => {
      const sections = [
        makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:00')], instructor: 'BadProf' }),
      ];

      const schedule = makeSchedule(sections, 3);
      const prefsWithExcluded = { ...basePreferences, excludeInstructors: ['BadProf'] };
      const score = calculateScheduleScore(schedule, prefsWithExcluded);

      expect(score).toBeLessThan(80);
    });
  });

  describe('conflict detection', () => {
    it('should detect time conflicts', () => {
      const slot1 = makeTimeSlot('M', '09:00', '10:30');
      const slot2 = makeTimeSlot('M', '10:00', '11:30');

      expect(hasTimeConflict(slot1, slot2)).toBe(true);
    });

    it('should not conflict on different days', () => {
      const slot1 = makeTimeSlot('M', '09:00', '10:30');
      const slot2 = makeTimeSlot('W', '09:00', '10:30');

      expect(hasTimeConflict(slot1, slot2)).toBe(false);
    });

    it('should detect section conflicts', () => {
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

    it('should find all conflicts in a schedule', () => {
      const sections = [
        makeSection({
          id: 's1',
          sectionNumber: '001',
          timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
        }),
        makeSection({
          id: 's2',
          sectionNumber: '002',
          timeSlots: [makeTimeSlot('M', '09:30', '10:30')],
        }),
        makeSection({
          id: 's3',
          sectionNumber: '003',
          timeSlots: [makeTimeSlot('W', '09:00', '10:00')],
        }),
      ];

      const conflicts = checkConflicts(sections);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0]).toContain('001');
    });
  });

  describe('formatTimeSlots', () => {
    it('should format single slot correctly', () => {
      const slots = [makeTimeSlot('M', '09:00', '10:00')];
      const { dayDisplay, timeDisplay } = formatTimeSlots(slots);

      expect(dayDisplay).toBe('M');
      expect(timeDisplay).toBe('9:00 AM - 10:00 AM');
    });

    it('should format multiple slots on same day', () => {
      const slots = [makeTimeSlot('M', '09:00', '10:00'), makeTimeSlot('M', '14:00', '15:00')];
      const { dayDisplay, timeDisplay } = formatTimeSlots(slots);

      expect(dayDisplay).toBe('M');
      expect(timeDisplay).toBe('9:00 AM - 10:00 AM');
    });

    it('should format multiple days', () => {
      const slots = [
        makeTimeSlot('M', '09:00', '10:00'),
        makeTimeSlot('W', '09:00', '10:00'),
        makeTimeSlot('F', '09:00', '10:00'),
      ];
      const { dayDisplay, timeDisplay } = formatTimeSlots(slots);

      expect(dayDisplay).toBe('MWF');
      expect(timeDisplay).toBe('9:00 AM - 10:00 AM');
    });

    it('should handle TBA', () => {
      const { dayDisplay, timeDisplay } = formatTimeSlots([]);

      expect(dayDisplay).toBe('');
      expect(timeDisplay).toBe('TBA');
    });

    it('should handle afternoon times', () => {
      const slots = [makeTimeSlot('M', '13:00', '14:30')];
      const { timeDisplay } = formatTimeSlots(slots);

      expect(timeDisplay).toBe('1:00 PM - 2:30 PM');
    });
  });
});
