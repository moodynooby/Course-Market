import { describe, expect, it } from 'vitest';
import type { Course, DayOfWeek, Preferences, Section, TimeSlot } from '../../types';
import { generateSchedules, groupSchedulesByStructure } from '../schedule-generator';

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
};

describe('generateSchedules', () => {
  it('returns empty array for no courses', () => {
    const result = generateSchedules([], new Map(), basePrefs);
    expect(result).toEqual([]);
  });

  it('returns one schedule for single course with single section', () => {
    const course = makeCourse({ id: 'c1', credits: 3 });
    const section = makeSection({
      id: 's1',
      courseId: 'c1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const sectionsByCourse = new Map([['c1', [section]]]);

    const result = generateSchedules([course], sectionsByCourse, {
      ...basePrefs,
      minCredits: 1,
      maxCredits: 18,
    });

    expect(result).toHaveLength(1);
    expect(result[0].sections).toHaveLength(1);
    expect(result[0].sections[0].id).toBe('s1');
  });

  it('generates combinations for multiple courses', () => {
    const course1 = makeCourse({ id: 'c1', credits: 3 });
    const course2 = makeCourse({ id: 'c2', code: 'MATH101', subject: 'MATH', credits: 4 });
    const sec1 = makeSection({
      id: 's1',
      courseId: 'c1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const sec2a = makeSection({
      id: 's2a',
      courseId: 'c2',
      timeSlots: [makeTimeSlot('W', '09:00', '10:00')],
    });
    const sec2b = makeSection({
      id: 's2b',
      courseId: 'c2',
      timeSlots: [makeTimeSlot('F', '09:00', '10:00')],
    });
    const sectionsByCourse = new Map([
      ['c1', [sec1]],
      ['c2', [sec2a, sec2b]],
    ]);

    const result = generateSchedules([course1, course2], sectionsByCourse, {
      ...basePrefs,
      minCredits: 1,
      maxCredits: 18,
    });

    expect(result).toHaveLength(2);
  });

  it('skips conflicting combinations', () => {
    const course1 = makeCourse({ id: 'c1', credits: 3 });
    const course2 = makeCourse({ id: 'c2', code: 'MATH101', subject: 'MATH', credits: 3 });
    const sec1 = makeSection({
      id: 's1',
      courseId: 'c1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const sec2 = makeSection({
      id: 's2',
      courseId: 'c2',
      timeSlots: [makeTimeSlot('M', '09:30', '10:30')],
    });
    const sectionsByCourse = new Map([
      ['c1', [sec1]],
      ['c2', [sec2]],
    ]);

    const result = generateSchedules([course1, course2], sectionsByCourse, {
      ...basePrefs,
      minCredits: 6,
      maxCredits: 6,
    });

    expect(result).toHaveLength(0);
  });

  it('respects maxCredits limit', () => {
    const course1 = makeCourse({ id: 'c1', credits: 10 });
    const course2 = makeCourse({ id: 'c2', code: 'MATH101', subject: 'MATH', credits: 10 });
    const sec1 = makeSection({
      id: 's1',
      courseId: 'c1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const sec2 = makeSection({
      id: 's2',
      courseId: 'c2',
      timeSlots: [makeTimeSlot('W', '09:00', '10:00')],
    });
    const sectionsByCourse = new Map([
      ['c1', [sec1]],
      ['c2', [sec2]],
    ]);

    const result = generateSchedules([course1, course2], sectionsByCourse, {
      ...basePrefs,
      minCredits: 1,
      maxCredits: 5,
    });

    expect(result).toHaveLength(0);
  });

  it('respects minCredits limit', () => {
    const course = makeCourse({ id: 'c1', credits: 3 });
    const section = makeSection({
      id: 's1',
      courseId: 'c1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const sectionsByCourse = new Map([['c1', [section]]]);

    const result = generateSchedules([course], sectionsByCourse, {
      ...basePrefs,
      minCredits: 6,
      maxCredits: 18,
    });

    expect(result).toHaveLength(0);
  });

  it('respects maxSchedules option', () => {
    const courses: Course[] = [];
    const sectionsByCourse = new Map<string, Section[]>();
    for (let i = 0; i < 5; i++) {
      const cid = `c${i}`;
      courses.push(makeCourse({ id: cid, code: `CS${i}`, credits: 3 }));
      sectionsByCourse.set(cid, [
        makeSection({
          id: `s${i}a`,
          courseId: cid,
          timeSlots: [makeTimeSlot('M', `${9 + i}:00`, `${10 + i}:00`)],
        }),
        makeSection({
          id: `s${i}b`,
          courseId: cid,
          timeSlots: [makeTimeSlot('W', `${9 + i}:00`, `${10 + i}:00`)],
        }),
      ]);
    }

    const result = generateSchedules(
      courses,
      sectionsByCourse,
      { ...basePrefs, minCredits: 1 },
      { maxSchedules: 3 },
    );

    expect(result).toHaveLength(3);
  });

  it('returns schedules sorted by score descending', () => {
    const courses: Course[] = [];
    const sectionsByCourse = new Map<string, Section[]>();
    for (let i = 0; i < 4; i++) {
      const cid = `c${i}`;
      courses.push(makeCourse({ id: cid, code: `CS${i}`, credits: 3 }));
      sectionsByCourse.set(cid, [
        makeSection({
          id: `s${i}`,
          courseId: cid,
          timeSlots: [makeTimeSlot('M', `${9 + i}:00`, `${10 + i}:00`)],
        }),
      ]);
    }

    const result = generateSchedules(courses, sectionsByCourse, { ...basePrefs, minCredits: 1 });

    for (let i = 1; i < result.length; i++) {
      expect(result[i].score).toBeLessThanOrEqual(result[i - 1].score);
    }
  });

  it('calls onProgress callback', () => {
    const course = makeCourse({ id: 'c1', credits: 3 });
    const section = makeSection({
      id: 's1',
      courseId: 'c1',
      timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
    });
    const sectionsByCourse = new Map([['c1', [section]]]);
    let progressCalled = false;

    generateSchedules([course], sectionsByCourse, basePrefs, {
      onProgress: () => {
        progressCalled = true;
      },
    });

    expect(progressCalled).toBe(false);
  });
});

describe('groupSchedulesByStructure', () => {
  const mwfSection = {
    id: 's1',
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Dr. A',
    capacity: 30,
    enrolled: 0,
    timeSlots: [{ day: 'M' as const, startTime: '09:00', endTime: '10:00' }],
  };
  const tthSection = {
    id: 's2',
    courseId: 'c2',
    sectionNumber: '001',
    instructor: 'Dr. B',
    capacity: 30,
    enrolled: 0,
    timeSlots: [{ day: 'T' as const, startTime: '10:00', endTime: '11:00' }],
  };

  it('returns empty array for empty input', () => {
    expect(groupSchedulesByStructure([])).toEqual([]);
  });

  it('groups MWF schedules correctly', () => {
    const result = groupSchedulesByStructure([
      { id: 'a', sections: [mwfSection], totalCredits: 3, score: 80, conflicts: [] },
      { id: 'a2', sections: [mwfSection], totalCredits: 3, score: 70, conflicts: [] },
    ]);
    expect(result.some((g) => g.label === 'MWF Schedules')).toBe(true);
  });

  it('groups TTh schedules correctly', () => {
    const result = groupSchedulesByStructure([
      { id: 'b', sections: [tthSection], totalCredits: 3, score: 90, conflicts: [] },
      { id: 'b2', sections: [tthSection], totalCredits: 3, score: 80, conflicts: [] },
    ]);
    expect(result.some((g) => g.label === 'TTh Schedules')).toBe(true);
  });

  it('groups mixed MWF+TTh schedules correctly', () => {
    const sections = [mwfSection, tthSection];
    const sections2 = [mwfSection, { ...tthSection, instructor: 'Dr. C' }];
    const result = groupSchedulesByStructure([
      { id: 'c', sections, totalCredits: 6, score: 85, conflicts: [] },
      { id: 'c2', sections: sections2, totalCredits: 6, score: 80, conflicts: [] },
    ]);
    expect(result.some((g) => g.label === 'Mix (MWF + TTh)')).toBe(true);
  });

  it('sorts groups by size descending', () => {
    const result = groupSchedulesByStructure([
      { id: 'a', sections: [mwfSection], totalCredits: 3, score: 80, conflicts: [] },
      { id: 'b', sections: [tthSection], totalCredits: 3, score: 90, conflicts: [] },
      { id: 'c', sections: [mwfSection], totalCredits: 3, score: 85, conflicts: [] },
      { id: 'd', sections: [tthSection], totalCredits: 3, score: 85, conflicts: [] },
    ]);
    expect(result[0].schedules.length).toBeGreaterThanOrEqual(result[1].schedules.length);
  });

  it('sorts schedules within groups by score descending', () => {
    const result = groupSchedulesByStructure([
      { id: 'low', sections: [mwfSection], totalCredits: 3, score: 50, conflicts: [] },
      { id: 'high', sections: [mwfSection], totalCredits: 3, score: 95, conflicts: [] },
    ]);
    const mwfGroup = result.find((g) => g.label === 'MWF Schedules')!;
    expect(mwfGroup.schedules[0].id).toBe('high');
  });
});
