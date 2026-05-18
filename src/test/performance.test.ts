import { describe, expect, it } from 'vitest';
import {
  calculateAbsoluteScheduleScore,
  checkConflicts,
  formatTimeSlots,
  hasSectionConflict,
  hasTimeConflict,
} from '../utils/schedule';
import { basePreferences, makeSchedule, makeSection, makeTimeSlot } from './performance-helpers';

describe('performance', () => {
  describe('schedule scoring', () => {
    it('returns valid scores within [0, 100] range', () => {
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

      const score = calculateAbsoluteScheduleScore(schedule, basePreferences);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes schedules exceeding credit limits', () => {
      const sections = [
        makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('W', '09:00', '10:00')] }),
      ];

      const schedule = makeSchedule(sections, 20);
      const score = calculateAbsoluteScheduleScore(schedule, basePreferences);

      expect(score).toBeLessThan(80);
    });

    it('penalizes schedules on avoided days', () => {
      const sections = [
        makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('F', '09:00', '10:00')] }),
      ];

      const schedule = makeSchedule(sections, 6);
      const prefsWithAvoidedDays: typeof basePreferences = {
        ...basePreferences,
        avoidDays: ['M', 'F'] as unknown as typeof basePreferences.avoidDays,
      };
      const score = calculateAbsoluteScheduleScore(schedule, prefsWithAvoidedDays);

      expect(score).toBeLessThan(100);
    });

    it('does not penalize Friday-to-Monday gaps across weekends', () => {
      const sections = [
        makeSection({ timeSlots: [makeTimeSlot('F', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('T', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('W', '09:00', '10:00')] }),
      ];

      const schedule = makeSchedule(sections, 12);
      const prefs = { ...basePreferences, preferConsecutiveDays: true };
      const score = calculateAbsoluteScheduleScore(schedule, prefs);

      expect(score).toBeGreaterThan(50);
    });

    it('ignores time conflicts across different date ranges', () => {
      const slot1 = makeTimeSlot('M', '09:00', '10:00');
      (slot1 as any).startDate = '2026-01-15';
      (slot1 as any).endDate = '2026-03-07';

      const slot2 = makeTimeSlot('M', '09:00', '10:00');
      (slot2 as any).startDate = '2026-03-15';
      (slot2 as any).endDate = '2026-05-01';

      expect(hasTimeConflict(slot1, slot2)).toBe(false);
    });

    it('detects time conflicts when date ranges overlap', () => {
      const slot1 = makeTimeSlot('M', '09:00', '10:00');
      (slot1 as any).startDate = '2026-01-15';
      (slot1 as any).endDate = '2026-04-01';

      const slot2 = makeTimeSlot('M', '09:00', '10:00');
      (slot2 as any).startDate = '2026-03-01';
      (slot2 as any).endDate = '2026-05-01';

      expect(hasTimeConflict(slot1, slot2)).toBe(true);
    });

    it('gives higher scores for compact schedules', () => {
      const sections = [
        makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('M', '10:00', '11:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('W', '09:00', '10:00')] }),
        makeSection({ timeSlots: [makeTimeSlot('W', '10:00', '11:00')] }),
      ];

      const schedule = makeSchedule(sections, 12);
      const score = calculateAbsoluteScheduleScore(schedule, basePreferences);

      expect(score).toBeGreaterThan(60);
    });

    it('penalizes missing evening classes when preferEvening is true', () => {
      const sections = [makeSection({ timeSlots: [makeTimeSlot('M', '10:00', '11:30')] })];

      const schedule = makeSchedule(sections, 3);
      const prefs = { ...basePreferences, preferEvening: true };
      const score = calculateAbsoluteScheduleScore(schedule, prefs);

      expect(score).toBeLessThan(60);
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

    it('identifies all conflicting sections in a schedule', () => {
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
    it('formats single time slot with day and time', () => {
      const slots = [makeTimeSlot('M', '09:00', '10:00')];
      const { dayDisplay, timeDisplay } = formatTimeSlots(slots);

      expect(dayDisplay).toBe('M');
      expect(timeDisplay).toBe('9:00 AM - 10:00 AM');
    });

    it('shows only first time when multiple slots exist on same day', () => {
      const slots = [makeTimeSlot('M', '09:00', '10:00'), makeTimeSlot('M', '14:00', '15:00')];
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
});
