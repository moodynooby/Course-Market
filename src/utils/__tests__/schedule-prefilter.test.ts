import { describe, expect, it } from 'vitest';
import type { Preferences, Section } from '../../types';
import { buildSectionsByCourse, prefilterSections } from '../schedule-prefilter';

function makeSection(overrides: Partial<Section>): Section {
  return {
    id: 's1',
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Dr. Test',
    timeSlots: [],
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

describe('buildSectionsByCourse', () => {
  it('groups all sections belonging to selected courses', () => {
    const selected = [makeSection({ id: 's1', courseId: 'c1' })];
    const all = [
      makeSection({ id: 's1', courseId: 'c1' }),
      makeSection({ id: 's2', courseId: 'c1' }),
      makeSection({ id: 's3', courseId: 'c2' }),
    ];

    const result = buildSectionsByCourse(selected, all, {});

    expect(result.size).toBe(1);
    expect(result.get('c1')?.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('restricts sections to only the pinned section when pinnedSelections is present', () => {
    const selected = [makeSection({ id: 's1', courseId: 'c1' })];
    const all = [
      makeSection({ id: 's1', courseId: 'c1' }),
      makeSection({ id: 's2', courseId: 'c1' }),
    ];

    const result = buildSectionsByCourse(selected, all, { c1: 's2' });

    expect(result.size).toBe(1);
    expect(result.get('c1')?.map((s) => s.id)).toEqual(['s2']);
  });
});

describe('prefilterSections', () => {
  it('deduplicates sections with identical time slots, keeping lowest enrolled', () => {
    const sec1 = makeSection({
      id: 's1',
      courseId: 'c1',
      enrolled: 25,
      timeSlots: [{ day: 'M', startTime: '10:00', endTime: '11:00' }],
    });
    const sec2 = makeSection({
      id: 's2',
      courseId: 'c1',
      enrolled: 5,
      timeSlots: [{ day: 'M', startTime: '10:00', endTime: '11:00' }],
    });
    const input = new Map([['c1', [sec1, sec2]]]);
    const courseCodes = new Map([['c1', 'CS101']]);

    const report = prefilterSections(input, basePrefs, courseCodes);

    const filtered = report.sectionsByCourse.get('c1');
    expect(filtered).toHaveLength(1);
    expect(filtered?.[0].id).toBe('s2');
    expect(report.summary.dedupRemoved).toBe(1);
    expect(report.summary.dedupCourses).toEqual(['CS101']);
  });

  it('removes sections on avoided days', () => {
    const secM = makeSection({
      id: 's1',
      courseId: 'c1',
      timeSlots: [{ day: 'M', startTime: '10:00', endTime: '11:00' }],
    });
    const secF = makeSection({
      id: 's2',
      courseId: 'c1',
      timeSlots: [{ day: 'F', startTime: '10:00', endTime: '11:00' }],
    });
    const input = new Map([['c1', [secM, secF]]]);
    const prefs: Preferences = { ...basePrefs, avoidDays: ['F'] };

    const report = prefilterSections(input, prefs, new Map([['c1', 'CS101']]));

    const filtered = report.sectionsByCourse.get('c1');
    expect(filtered).toHaveLength(1);
    expect(filtered?.[0].id).toBe('s1');
    expect(report.summary.avoidDayRemoved).toBe(1);
  });

  it('never leaves a course empty if all sections fall on avoided days', () => {
    const secF = makeSection({
      id: 's1',
      courseId: 'c1',
      timeSlots: [{ day: 'F', startTime: '10:00', endTime: '11:00' }],
    });
    const input = new Map([['c1', [secF]]]);
    const prefs: Preferences = { ...basePrefs, avoidDays: ['F'] };

    const report = prefilterSections(input, prefs, new Map([['c1', 'CS101']]));

    const filtered = report.sectionsByCourse.get('c1');
    expect(filtered).toHaveLength(1);
    expect(filtered?.[0].id).toBe('s1');
  });
});
