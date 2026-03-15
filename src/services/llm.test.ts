import { describe, expect, it } from 'vitest';
import type { Preferences, Schedule, Section } from '../types';
import { buildScheduleAnalysisPrompt } from './llm';

describe('llm', () => {
  describe('buildScheduleAnalysisPrompt', () => {
    it('builds prompt with schedule and preferences in structured markdown', () => {
      const schedule: Schedule = {
        id: 's1',
        name: 'Test',
        sections: [
          {
            id: 'sec1',
            courseId: 'CS 101',
            sectionNumber: '1',
            instructor: 'Dr. Smith',
            timeSlots: [{ day: 'M', startTime: '09:00', endTime: '10:00' }],
            capacity: 30,
            enrolled: 0,
          },
        ],
        totalCredits: 3,
        score: 85,
        conflicts: [],
      };

      const preferences: Preferences = {
        preferredStartTime: '08:00',
        preferredEndTime: '17:00',
        maxGapMinutes: 60,
        preferConsecutiveDays: true,
        preferMorning: true,
        preferAfternoon: false,
        maxCredits: 18,
        minCredits: 12,
        avoidDays: ['Su'],
        excludeInstructors: [],
      };

      const prompt = buildScheduleAnalysisPrompt(schedule, preferences);

      expect(prompt).toContain('Dr. Smith');
      expect(prompt).toContain('08:00');
      expect(prompt).toContain('17:00');
      expect(prompt).toContain('3');
      expect(prompt).toContain('85');
      expect(prompt).toContain('Current Schedule Details');
      expect(prompt).toContain('Weekly Time Slots');
      expect(prompt).toContain('Morning classes');
      expect(prompt).toContain('Su');
    });

    it('filters and limits alternative sections to only include relevant courses', () => {
      const schedule: Schedule = {
        id: 's1',
        name: 'Test',
        sections: [
          {
            id: 'sec1',
            courseId: 'CS 101',
            sectionNumber: '1',
            instructor: 'Dr. Smith',
            timeSlots: [{ day: 'M', startTime: '09:00', endTime: '10:00' }],
            capacity: 30,
            enrolled: 0,
          },
        ],
        totalCredits: 3,
        score: 85,
        conflicts: [],
      };

      const preferences: Preferences = {
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

      const allSections: Section[] = [
        {
          id: 'sec2',
          courseId: 'CS 101',
          sectionNumber: '2',
          instructor: 'Dr. Jones',
          timeSlots: [{ day: 'T', startTime: '10:00', endTime: '11:00' }],
          capacity: 30,
          enrolled: 0,
        },
        {
          id: 'sec3',
          courseId: 'BIO 201', // Should be filtered out
          sectionNumber: '1',
          instructor: 'Dr. Brown',
          timeSlots: [{ day: 'W', startTime: '12:00', endTime: '13:00' }],
          capacity: 30,
          enrolled: 0,
        },
      ];

      const prompt = buildScheduleAnalysisPrompt(schedule, preferences, allSections);

      expect(prompt).toContain('CS 101');
      expect(prompt).toContain('Dr. Jones');
      expect(prompt).not.toContain('BIO 201');
      expect(prompt).not.toContain('Dr. Brown');
    });

    it('handles empty schedule gracefully', () => {
      const schedule = {
        id: 's1',
        name: 'Test',
        sections: [],
        totalCredits: 0,
        score: 0,
        conflicts: [],
      } as Schedule;

      const preferences = {
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
      } as Preferences;

      const prompt = buildScheduleAnalysisPrompt(schedule, preferences);

      expect(prompt).toContain('Analyze the provided schedule');
    });
  });
});
