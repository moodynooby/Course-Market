import type { Schedule, Preferences, Section, TimeSlot, DayOfWeek } from '../types';

export const makeTimeSlot = (day: DayOfWeek, startTime: string, endTime: string): TimeSlot => ({
  day,
  startTime,
  endTime,
});

export const makeSection = (overrides: Partial<Section>): Section => ({
  id: 's1',
  courseId: 'c1',
  sectionNumber: '1',
  instructor: 'Test',
  timeSlots: [],
  capacity: 30,
  enrolled: 0,
  ...overrides,
});

export const basePreferences: Preferences = {
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

export const makeSchedule = (sections: Section[], totalCredits: number): Schedule => ({
  id: 'sched',
  name: 'Test',
  sections,
  totalCredits,
  score: 0,
  conflicts: [],
});
