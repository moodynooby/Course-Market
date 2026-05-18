import { describe, expect, it } from 'vitest';
import type { Course, DayOfWeek, Preferences, Section, TimeSlot } from '../../types';
import {
  clusterSchedulesBySimilarity,
  generateSchedules,
  REDUNDANT_VARIANT_PENALTY,
  scheduleFootprint,
} from '../schedule-generator';

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
  it('returns empty array when no courses provided', () => {
    const result = generateSchedules([], new Map(), basePrefs);
    expect(result).toEqual([]);
  });

  it('generates one schedule for single course with single section', () => {
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
    expect(result[0].sections[0].id).toBe('s1');
  });

  it('generates all non-conflicting combinations for multiple courses', () => {
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

  it('filters out schedules with time conflicts', () => {
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

  it('rejects schedules exceeding maxCredits', () => {
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

  it('rejects schedules below minCredits', () => {
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

  it('limits output to maxSchedules option', () => {
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

  it('returns results sorted by score descending', () => {
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

  it('invokes onProgress callback during iteration', () => {
    const courses: Course[] = [];
    const sectionsByCourse = new Map<string, Section[]>();
    for (let i = 0; i < 4; i++) {
      const cid = `c${i}`;
      courses.push(makeCourse({ id: cid, code: `CS${i}`, credits: 3 }));
      const sections: Section[] = [];
      const days: DayOfWeek[] = ['M', 'T', 'W', 'Th', 'F'];
      for (let j = 0; j < 5; j++) {
        sections.push(
          makeSection({
            id: `s${i}-${j}`,
            courseId: cid,
            timeSlots: [makeTimeSlot(days[j], '09:00', '10:00')],
          }),
        );
      }
      sectionsByCourse.set(cid, sections);
    }
    let progressCalled = false;

    generateSchedules(
      courses,
      sectionsByCourse,
      { ...basePrefs, minCredits: 1, maxCredits: 18 },
      {
        onProgress: () => {
          progressCalled = true;
        },
      },
    );

    expect(progressCalled).toBe(true);
  });
});

describe('clusterSchedulesBySimilarity', () => {
  const morningMwfSection = {
    id: 's-mwf-am',
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Dr. A',
    capacity: 30,
    enrolled: 0,
    timeSlots: [
      { day: 'M' as const, startTime: '09:00', endTime: '10:00' },
      { day: 'W' as const, startTime: '09:00', endTime: '10:00' },
      { day: 'F' as const, startTime: '09:00', endTime: '10:00' },
    ],
  };
  const eveningTthSection = {
    id: 's-tth-pm',
    courseId: 'c2',
    sectionNumber: '001',
    instructor: 'Dr. B',
    capacity: 30,
    enrolled: 0,
    timeSlots: [
      { day: 'T' as const, startTime: '18:00', endTime: '19:00' },
      { day: 'Th' as const, startTime: '18:00', endTime: '19:00' },
    ],
  };

  it('returns empty array for empty input', () => {
    expect(clusterSchedulesBySimilarity([])).toEqual([]);
  });

  it('places every schedule in exactly one cluster', () => {
    const schedules = [
      { id: 'a', sections: [morningMwfSection], totalCredits: 3, score: 90, conflicts: [] },
      { id: 'b', sections: [morningMwfSection], totalCredits: 3, score: 85, conflicts: [] },
      { id: 'c', sections: [eveningTthSection], totalCredits: 3, score: 80, conflicts: [] },
      { id: 'd', sections: [eveningTthSection], totalCredits: 3, score: 75, conflicts: [] },
    ];

    const clusters = clusterSchedulesBySimilarity(schedules);
    const total = clusters.reduce((acc, c) => acc + c.schedules.length, 0);
    expect(total).toBe(schedules.length);

    const seenIds = new Set<string>();
    for (const c of clusters) {
      for (const s of c.schedules) {
        expect(seenIds.has(s.id)).toBe(false);
        seenIds.add(s.id);
      }
    }
  });

  it('clusters near-identical schedules together', () => {
    const schedules = [
      { id: 'a', sections: [morningMwfSection], totalCredits: 3, score: 90, conflicts: [] },
      { id: 'b', sections: [morningMwfSection], totalCredits: 3, score: 85, conflicts: [] },
    ];
    const clusters = clusterSchedulesBySimilarity(schedules);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].schedules.map((s) => s.id).sort()).toEqual(['a', 'b']);
  });

  it('separates very dissimilar schedules into different clusters', () => {
    const schedules = [
      { id: 'mwf-am', sections: [morningMwfSection], totalCredits: 3, score: 90, conflicts: [] },
      { id: 'tth-pm', sections: [eveningTthSection], totalCredits: 3, score: 80, conflicts: [] },
    ];
    const clusters = clusterSchedulesBySimilarity(schedules);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
  });

  it('sorts clusters by topScore descending and items by score descending', () => {
    const schedules = [
      { id: 'mwf-low', sections: [morningMwfSection], totalCredits: 3, score: 60, conflicts: [] },
      { id: 'mwf-high', sections: [morningMwfSection], totalCredits: 3, score: 95, conflicts: [] },
      { id: 'tth-mid', sections: [eveningTthSection], totalCredits: 3, score: 80, conflicts: [] },
    ];
    const clusters = clusterSchedulesBySimilarity(schedules);
    for (let i = 1; i < clusters.length; i++) {
      expect(clusters[i].topScore).toBeLessThanOrEqual(clusters[i - 1].topScore);
    }
    for (const c of clusters) {
      for (let i = 1; i < c.schedules.length; i++) {
        expect(c.schedules[i].score).toBeLessThanOrEqual(c.schedules[i - 1].score);
      }
    }
  });

  it('exposes id, label, description, schedules, topScore', () => {
    const clusters = clusterSchedulesBySimilarity([
      { id: 'a', sections: [morningMwfSection], totalCredits: 3, score: 90, conflicts: [] },
    ]);
    expect(clusters[0]).toMatchObject({
      id: expect.any(String),
      label: expect.any(String),
      description: expect.any(String),
      topScore: 90,
    });
    expect(clusters[0].schedules).toHaveLength(1);
  });

  it('includes day-count and gap density in cluster labels', () => {
    const clusters = clusterSchedulesBySimilarity([
      { id: 'a', sections: [morningMwfSection], totalCredits: 3, score: 90, conflicts: [] },
    ]);
    expect(clusters[0].label).toContain('3-day');
    expect(clusters[0].label).toContain('tight');
  });
});

describe('redundant section-swap penalty', () => {
  it('penalizes all-but-one variant when sections share an identical time footprint', () => {
    const courseA = makeCourse({ id: 'A', code: 'A101', credits: 3 });
    const courseB = makeCourse({ id: 'B', code: 'B101', credits: 3 });
    const aSections = [0, 1, 2].map((i) =>
      makeSection({
        id: `a${i}`,
        courseId: 'A',
        sectionNumber: `00${i}`,
        timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
      }),
    );
    const bSections = [
      makeSection({
        id: 'b0',
        courseId: 'B',
        timeSlots: [makeTimeSlot('T', '11:00', '12:00')],
      }),
      makeSection({
        id: 'b1',
        courseId: 'B',
        timeSlots: [makeTimeSlot('Th', '11:00', '12:00')],
      }),
    ];
    const result = generateSchedules(
      [courseA, courseB],
      new Map([
        ['A', aSections],
        ['B', bSections],
      ]),
      { ...basePrefs, minCredits: 1, maxCredits: 18 },
    );

    expect(result).toHaveLength(6);

    const byFp = new Map<string, number[]>();
    for (const r of result) {
      const fp = scheduleFootprint(r.sections);
      const arr = byFp.get(fp) ?? [];
      arr.push(r.score);
      byFp.set(fp, arr);
    }
    expect(byFp.size).toBe(2);
    for (const scores of byFp.values()) {
      expect(scores).toHaveLength(3);
      scores.sort((a, b) => b - a);
      expect(scores[0] - scores[1]).toBeGreaterThanOrEqual(REDUNDANT_VARIANT_PENALTY - 1);
      expect(scores[0] - scores[2]).toBeGreaterThanOrEqual(REDUNDANT_VARIANT_PENALTY - 1);
    }
  });

  it('does not penalize schedules with unique footprints', () => {
    const courseA = makeCourse({ id: 'A', code: 'A101', credits: 3 });
    const aSections = [
      makeSection({
        id: 'a0',
        courseId: 'A',
        timeSlots: [makeTimeSlot('M', '09:00', '10:00')],
      }),
      makeSection({
        id: 'a1',
        courseId: 'A',
        timeSlots: [makeTimeSlot('W', '09:00', '10:00')],
      }),
    ];
    const result = generateSchedules([courseA], new Map([['A', aSections]]), {
      ...basePrefs,
      minCredits: 1,
      maxCredits: 18,
    });

    expect(result).toHaveLength(2);
    for (const r of result) {
      expect(r.score).toBeGreaterThan(-REDUNDANT_VARIANT_PENALTY / 2);
    }
  });
});
