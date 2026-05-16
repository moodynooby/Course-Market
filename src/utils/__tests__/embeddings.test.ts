import { describe, expect, it } from 'vitest';
import {
  CONFLICTS_NORMALIZATION_MAX,
  CREDITS_NORMALIZATION_MAX,
  cosineSimilarity,
  getScheduleFeatureVector,
  getScheduleIntrinsicQuality,
} from '../embeddings';
import type { GeneratedSchedule } from '../schedule-types';

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

describe('getScheduleIntrinsicQuality', () => {
  it('is independent of schedule.score', () => {
    const a = makeSchedule({ score: 5 });
    const b = makeSchedule({ score: 95 });
    expect(getScheduleIntrinsicQuality(a)).toBe(getScheduleIntrinsicQuality(b));
  });

  it('penalizes slots outside the daytime window', () => {
    const inside = makeSchedule({
      sections: [
        {
          id: 's1',
          courseId: 'c1',
          sectionNumber: '001',
          instructor: '',
          capacity: 30,
          enrolled: 0,
          timeSlots: [{ day: 'M' as const, startTime: '10:00', endTime: '11:00' }],
        },
      ],
    });
    const early = makeSchedule({
      sections: [
        {
          id: 's2',
          courseId: 'c1',
          sectionNumber: '002',
          instructor: '',
          capacity: 30,
          enrolled: 0,
          timeSlots: [{ day: 'M' as const, startTime: '06:00', endTime: '07:00' }],
        },
      ],
    });
    expect(getScheduleIntrinsicQuality(inside)).toBeGreaterThan(getScheduleIntrinsicQuality(early));
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
