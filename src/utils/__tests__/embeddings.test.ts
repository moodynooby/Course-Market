import { describe, expect, it } from 'vitest';
import type { GeneratedSchedule } from '../schedule-types';
import { cosineSimilarity, getScheduleFeatureVector } from '../embeddings';

function makeSchedule(overrides: Partial<GeneratedSchedule>): GeneratedSchedule {
  return {
    id: 's1',
    sections: [],
    totalCredits: 3,
    score: 50,
    conflicts: [],
    ...overrides,
  };
}

describe('getScheduleFeatureVector', () => {
  it('returns a vector of length 12', () => {
    const vec = getScheduleFeatureVector(makeSchedule({}));
    expect(vec).toHaveLength(12);
  });

  it('all values are 0 for empty schedule', () => {
    const vec = getScheduleFeatureVector(makeSchedule({
      totalCredits: 0,
      score: 0,
      sections: [],
    }));
    expect(vec.every((v) => v === 0)).toBe(true);
  });

  it('normalizes credits correctly', () => {
    const vec = getScheduleFeatureVector(makeSchedule({ totalCredits: 21 }));
    expect(vec[0]).toBe(1);
  });

  it('normalizes score correctly', () => {
    const vec = getScheduleFeatureVector(makeSchedule({ score: 100 }));
    expect(vec[1]).toBe(1);
  });

  it('caps conflict count at 1', () => {
    const vec = getScheduleFeatureVector(makeSchedule({ conflicts: ['a', 'b', 'c', 'd', 'e', 'f'] }));
    expect(vec[3]).toBe(1);
  });

  it('distributes time-of-day counts', () => {
    const schedule = makeSchedule({
      sections: [
        {
          id: 's1',
          courseId: 'c1',
          sectionNumber: '001',
          instructor: 'Dr. A',
          capacity: 30,
          enrolled: 0,
          timeSlots: [
            { day: 'M' as const, startTime: '09:00', endTime: '10:00' },
          ],
        },
      ],
    });
    const vec = getScheduleFeatureVector(schedule);

    expect(vec[9]).toBe(1);
    expect(vec[10]).toBe(0);
    expect(vec[11]).toBe(0);
  });

  it('counts afternoon slots correctly', () => {
    const schedule = makeSchedule({
      sections: [
        {
          id: 's1',
          courseId: 'c1',
          sectionNumber: '001',
          instructor: 'Dr. A',
          capacity: 30,
          enrolled: 0,
          timeSlots: [
            { day: 'M' as const, startTime: '14:00', endTime: '15:00' },
          ],
        },
      ],
    });
    const vec = getScheduleFeatureVector(schedule);

    expect(vec[10]).toBe(1);
  });

  it('detects Monday slot in day counts', () => {
    const schedule = makeSchedule({
      sections: [
        {
          id: 's1',
          courseId: 'c1',
          sectionNumber: '001',
          instructor: 'Dr. A',
          capacity: 30,
          enrolled: 0,
          timeSlots: [
            { day: 'M' as const, startTime: '09:00', endTime: '10:00' },
          ],
        },
      ],
    });
    const vec = getScheduleFeatureVector(schedule);

    expect(vec[4]).toBeGreaterThan(0);
    expect(vec[5]).toBe(0);
    expect(vec[6]).toBe(0);
    expect(vec[7]).toBe(0);
    expect(vec[8]).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const vec = [1, 2, 3];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 10);
  });

  it('throws for different length vectors', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have the same length');
  });

  it('returns 0 for orthogonal vectors (one all zeros)', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 10);
  });

  it('returns near 0 for orthogonal vectors', () => {
    const result = cosineSimilarity([1, 0], [0, 1]);
    expect(result).toBeCloseTo(0, 10);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});
