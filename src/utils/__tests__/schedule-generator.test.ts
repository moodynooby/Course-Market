import { describe, expect, it } from 'vitest';
import type { Course, DayOfWeek, Preferences, Section, TimeSlot } from '../../types';
import { clusterSchedules, generateSchedules } from '../schedule-generator';

function makeTimeSlot(day: DayOfWeek, startTime: string, endTime: string): TimeSlot {
  return { day, startTime, endTime };
}

function makeSection(overrides: Partial<Section> & { timeSlots: TimeSlot[] }): Section {
  return {
    id: 's1',
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Dr. Test',
    capacity: 30,
    enrolled: 0,
    ...overrides,
  };
}

function makeCourse(overrides: Partial<Course>): Course {
  return {
    id: 'c1',
    code: 'CS101',
    name: 'Intro to CS',
    subject: 'CS',
    credits: 3,
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
  excludeInstructors: [],
};

describe('generateSchedules', () => {
  it('returns empty array for no courses', () => {
    const result = generateSchedules([], new Map(), basePrefs);
    expect(result).toEqual([]);
  });

  it('returns one schedule for single course with single section', () => {
    const course = makeCourse({ id: 'c1', credits: 3 });
    const section = makeSection({ id: 's1', courseId: 'c1', timeSlots: [makeTimeSlot('M', '09:00', '10:00')] });
    const sectionsByCourse = new Map([['c1', [section]]]);

    const result = generateSchedules([course], sectionsByCourse, { ...basePrefs, minCredits: 1, maxCredits: 18 });

    expect(result).toHaveLength(1);
    expect(result[0].sections).toHaveLength(1);
    expect(result[0].sections[0].id).toBe('s1');
  });

  it('generates combinations for multiple courses', () => {
    const course1 = makeCourse({ id: 'c1', credits: 3 });
    const course2 = makeCourse({ id: 'c2', code: 'MATH101', subject: 'MATH', credits: 4 });
    const sec1 = makeSection({ id: 's1', courseId: 'c1', timeSlots: [makeTimeSlot('M', '09:00', '10:00')] });
    const sec2a = makeSection({ id: 's2a', courseId: 'c2', timeSlots: [makeTimeSlot('W', '09:00', '10:00')] });
    const sec2b = makeSection({ id: 's2b', courseId: 'c2', timeSlots: [makeTimeSlot('F', '09:00', '10:00')] });
    const sectionsByCourse = new Map([
      ['c1', [sec1]],
      ['c2', [sec2a, sec2b]],
    ]);

    const result = generateSchedules([course1, course2], sectionsByCourse, { ...basePrefs, minCredits: 1, maxCredits: 18 });

    expect(result).toHaveLength(2);
  });

  it('skips conflicting combinations', () => {
    const course1 = makeCourse({ id: 'c1', credits: 3 });
    const course2 = makeCourse({ id: 'c2', code: 'MATH101', subject: 'MATH', credits: 3 });
    const sec1 = makeSection({ id: 's1', courseId: 'c1', timeSlots: [makeTimeSlot('M', '09:00', '10:00')] });
    const sec2 = makeSection({ id: 's2', courseId: 'c2', timeSlots: [makeTimeSlot('M', '09:30', '10:30')] });
    const sectionsByCourse = new Map([
      ['c1', [sec1]],
      ['c2', [sec2]],
    ]);

    const result = generateSchedules([course1, course2], sectionsByCourse, { ...basePrefs, minCredits: 6, maxCredits: 6 });

    expect(result).toHaveLength(0);
  });

  it('respects maxCredits limit', () => {
    const course1 = makeCourse({ id: 'c1', credits: 10 });
    const course2 = makeCourse({ id: 'c2', code: 'MATH101', subject: 'MATH', credits: 10 });
    const sec1 = makeSection({ id: 's1', courseId: 'c1', timeSlots: [makeTimeSlot('M', '09:00', '10:00')] });
    const sec2 = makeSection({ id: 's2', courseId: 'c2', timeSlots: [makeTimeSlot('W', '09:00', '10:00')] });
    const sectionsByCourse = new Map([
      ['c1', [sec1]],
      ['c2', [sec2]],
    ]);

    const result = generateSchedules([course1, course2], sectionsByCourse, { ...basePrefs, minCredits: 1, maxCredits: 5 });

    expect(result).toHaveLength(0);
  });

  it('respects minCredits limit', () => {
    const course = makeCourse({ id: 'c1', credits: 3 });
    const section = makeSection({ id: 's1', courseId: 'c1', timeSlots: [makeTimeSlot('M', '09:00', '10:00')] });
    const sectionsByCourse = new Map([['c1', [section]]]);

    const result = generateSchedules([course], sectionsByCourse, { ...basePrefs, minCredits: 6, maxCredits: 18 });

    expect(result).toHaveLength(0);
  });

  it('respects maxSchedules option', () => {
    const courses: Course[] = [];
    const sectionsByCourse = new Map<string, Section[]>();
    for (let i = 0; i < 5; i++) {
      const cid = `c${i}`;
      courses.push(makeCourse({ id: cid, code: `CS${i}`, credits: 3 }));
      sectionsByCourse.set(cid, [
        makeSection({ id: `s${i}a`, courseId: cid, timeSlots: [makeTimeSlot('M', `${9 + i}:00`, `${10 + i}:00`)] }),
        makeSection({ id: `s${i}b`, courseId: cid, timeSlots: [makeTimeSlot('W', `${9 + i}:00`, `${10 + i}:00`)] }),
      ]);
    }

    const result = generateSchedules(courses, sectionsByCourse, { ...basePrefs, minCredits: 1 }, { maxSchedules: 3 });

    expect(result).toHaveLength(3);
  });

  it('returns schedules sorted by score descending', () => {
    const courses: Course[] = [];
    const sectionsByCourse = new Map<string, Section[]>();
    for (let i = 0; i < 4; i++) {
      const cid = `c${i}`;
      courses.push(makeCourse({ id: cid, code: `CS${i}`, credits: 3 }));
      sectionsByCourse.set(cid, [
        makeSection({ id: `s${i}`, courseId: cid, timeSlots: [makeTimeSlot('M', `${9 + i}:00`, `${10 + i}:00`)] }),
      ]);
    }

    const result = generateSchedules(courses, sectionsByCourse, { ...basePrefs, minCredits: 1 });

    for (let i = 1; i < result.length; i++) {
      expect(result[i].score).toBeLessThanOrEqual(result[i - 1].score);
    }
  });

  it('calls onProgress callback', () => {
    const course = makeCourse({ id: 'c1', credits: 3 });
    const section = makeSection({ id: 's1', courseId: 'c1', timeSlots: [makeTimeSlot('M', '09:00', '10:00')] });
    const sectionsByCourse = new Map([['c1', [section]]]);
    let progressCalled = false;

    generateSchedules([course], sectionsByCourse, basePrefs, {
      onProgress: () => { progressCalled = true; },
    });

    expect(progressCalled).toBe(false);
  });
});

describe('clusterSchedules', () => {
  it('returns empty array for empty input', () => {
    expect(clusterSchedules([])).toEqual([]);
  });

  it('returns single cluster for one schedule', () => {
    const schedule = { id: 's1', sections: [], totalCredits: 3, score: 80, conflicts: [] };
    const result = clusterSchedules([schedule], 5);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Score: 80');
    expect(result[0].representative).toBe(schedule);
  });

  it('creates one cluster per schedule when count <= nClusters', () => {
    const s1 = { id: 's1', sections: [], totalCredits: 3, score: 90, conflicts: [] };
    const s2 = { id: 's2', sections: [], totalCredits: 3, score: 80, conflicts: [] };
    const result = clusterSchedules([s1, s2], 5);

    expect(result).toHaveLength(2);
  });

  it('groups similar scores into same bucket', () => {
    const schedules = [
      { id: 's1', sections: [], totalCredits: 3, score: 95, conflicts: [] },
      { id: 's2', sections: [], totalCredits: 3, score: 94, conflicts: [] },
      { id: 's3', sections: [], totalCredits: 3, score: 50, conflicts: [] },
      { id: 's4', sections: [], totalCredits: 3, score: 45, conflicts: [] },
    ];

    const result = clusterSchedules(schedules, 2);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(2);

    const allSchedules = result.flatMap((c) => c.schedules);
    expect(allSchedules).toHaveLength(4);
  });

  it('assigns correct labels when more schedules than clusters', () => {
    const schedules = [
      { id: 's1', sections: [], totalCredits: 3, score: 100, conflicts: [] },
      { id: 's2', sections: [], totalCredits: 3, score: 80, conflicts: [] },
      { id: 's3', sections: [], totalCredits: 3, score: 60, conflicts: [] },
      { id: 's4', sections: [], totalCredits: 3, score: 40, conflicts: [] },
      { id: 's5', sections: [], totalCredits: 3, score: 20, conflicts: [] },
      { id: 's6', sections: [], totalCredits: 3, score: 0, conflicts: [] },
    ];

    const result = clusterSchedules(schedules, 5);

    expect(result[0].label).toBe('Best Match');
  });

  it('picks highest score as representative', () => {
    const schedules = [
      { id: 'low', sections: [], totalCredits: 3, score: 50, conflicts: [] },
      { id: 'high', sections: [], totalCredits: 3, score: 95, conflicts: [] },
      { id: 'mid', sections: [], totalCredits: 3, score: 75, conflicts: [] },
    ];

    const result = clusterSchedules(schedules, 1);

    expect(result).toHaveLength(1);
    expect(result[0].representative.id).toBe('high');
  });
});
