import { describe, it, expect } from 'vitest';
import { buildScheduleAnalysisPrompt } from './llm';
import type { Schedule, Preferences } from '../types';

describe('llm', () => {
  describe('buildScheduleAnalysisPrompt', () => {
    it('builds prompt with schedule and preferences', () => {
      const schedule: Schedule = {
        id: 's1',
        name: 'Test',
        sections: [
          {
            id: 'sec1',
            courseId: 'c1',
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

      const prompt = buildScheduleAnalysisPrompt(schedule, preferences);

      expect(prompt).toContain('Dr. Smith');
      expect(prompt).toContain('08:00');
      expect(prompt).toContain('17:00');
      expect(prompt).toContain('3'); 
      expect(prompt).toContain('85'); 
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

      expect(prompt).toContain('Analyze this course schedule');
    });
  });
});
