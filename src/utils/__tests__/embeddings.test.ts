import { describe, expect, it } from 'vitest';
import type { Schedule } from '../../types';
import {
  CONFLICTS_NORMALIZATION_MAX,
  CREDITS_NORMALIZATION_MAX,
  cosineSimilarity,
  getScheduleFeatureVector,
} from '../embeddings';

function makeSchedule(overrides: Partial<Schedule>): Schedule {
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
  it('normalizes credits to [0,1] with documented cap', () => {
    const vec = getScheduleFeatureVector(makeSchedule({ totalCredits: CREDITS_NORMALIZATION_MAX }));
    expect(vec[0]).toBe(1);
  });

  it('encodes intrinsic quality independent of relative score', () => {
    const low = getScheduleFeatureVector(makeSchedule({ score: 0 }));
    const high = getScheduleFeatureVector(makeSchedule({ score: 100 }));
    expect(low[1]).toBe(high[1]);
  });

  it('clamps conflict count at documented maximum', () => {
    const overflow = CONFLICTS_NORMALIZATION_MAX + 2;
    const vec = getScheduleFeatureVector(
      makeSchedule({ conflicts: Array.from({ length: overflow }, (_, i) => String(i)) }),
    );
    expect(vec[3]).toBe(1);
  });

  it('distributes time-of-day as fractions of total slots', () => {
    const schedule = makeSchedule({
      sections: [
        {
          id: 's1',
          courseId: 'c1',
          sectionNumber: '001',
          instructor: 'Dr. A',
          capacity: 30,
          enrolled: 0,
          timeSlots: [{ day: 'M' as const, startTime: '09:00', endTime: '10:00' }],
        },
      ],
    });
    const vec = getScheduleFeatureVector(schedule);

    expect(vec[9]).toBe(1);
    expect(vec[10]).toBe(0);
    expect(vec[11]).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('throws when vectors have different lengths', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have the same length');
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 1 for identical vectors', () => {
    const vec = [1, 2, 3];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 10);
  });
});
