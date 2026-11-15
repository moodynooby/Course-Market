import { describe, expect, it } from 'vitest';
import type { Course, Preferences, Section, TimeSlot } from '../../types';
import { diagnoseEmptyGeneration } from '../schedule-diagnostics';

function makeTimeSlot(
  day: import('../../types').DayOfWeek,
  startTime: string,
  endTime: string,
): TimeSlot {
  return { day, startTime, endTime };
}

function makeSection(overrides: Partial<Section> & { timeSlots: TimeSlot[] }): Section {
  return {
    id: 's1',
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Dr. Test',
    capacity: 30,
    enrolled: 10,
    ...overrides,
  };
}

const basePrefs: Preferences = {
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

describe('diagnoseEmptyGeneration', () => {
  it('detects unavoidable conflicts when a section conflicts with all sections of another course', () => {
    const courseA: Course = {
      id: 'c1',
      code: 'CS101',
      name: 'Intro CS',
      subject: 'CS',
      credits: 3,
    };
    const courseB: Course = {
      id: 'c2',
      code: 'MATH101',
      name: 'Calculus',
      subject: 'MATH',
      credits: 3,
    };
    const courseC: Course = {
      id: 'c3',
      code: 'PHYS101',
      name: 'Physics',
      subject: 'PHYS',
      credits: 3,
    };

    // Course A has a section that conflicts with both sections of Course B, but not Course C
    const secA1 = makeSection({
      id: 'sec-a1',
      courseId: 'c1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const secB1 = makeSection({
      id: 'sec-b1',
      courseId: 'c2',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const secB2 = makeSection({
      id: 'sec-b2',
      courseId: 'c2',
      timeSlots: [makeTimeSlot('M', '09:30', '10:30')],
    });
    const secC1 = makeSection({
      id: 'sec-c1',
      courseId: 'c3',
      timeSlots: [makeTimeSlot('W', '09:00', '10:00')],
    });

    const sectionsByCourse = new Map<string, Section[]>([
      ['c1', [secA1]],
      ['c2', [secB1, secB2]],
      ['c3', [secC1]],
    ]);

    const result = diagnoseEmptyGeneration(
      [courseA, courseB, courseC],
      sectionsByCourse,
      { ...basePrefs, minCredits: 9, maxCredits: 9 },
      new Map(),
    );

    const c1Breakdown = result.courseBreakdown.find((c) => c.courseId === 'c1');
    expect(c1Breakdown).toBeDefined();
    expect(c1Breakdown?.conflictingSections).toBe(1);
    expect(c1Breakdown?.hasNonConflictingSections).toBe(false);
  });

  it('correctly reports credit-range diagnostic when selected courses exceed maxCredits', () => {
    const courseA: Course = {
      id: 'c1',
      code: 'CS101',
      name: 'Intro CS',
      subject: 'CS',
      credits: 10,
    };
    const courseB: Course = {
      id: 'c2',
      code: 'MATH101',
      name: 'Calculus',
      subject: 'MATH',
      credits: 10,
    };

    const secA1 = makeSection({
      id: 'sec-a1',
      courseId: 'c1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const secB1 = makeSection({
      id: 'sec-b1',
      courseId: 'c2',
      timeSlots: [makeTimeSlot('W', '09:00', '10:00')],
    });

    const sectionsByCourse = new Map<string, Section[]>([
      ['c1', [secA1]],
      ['c2', [secB1]],
    ]);

    const result = diagnoseEmptyGeneration(
      [courseA, courseB],
      sectionsByCourse,
      { ...basePrefs, minCredits: 5, maxCredits: 15 },
      new Map(),
    );

    const creditReason = result.reasons.find((r) => r.type === 'credit-range');
    expect(creditReason).toBeDefined();
    expect(creditReason?.message).toContain(
      'Total selected credits (20) exceeds your maximum credit preference (15)',
    );
  });
});
