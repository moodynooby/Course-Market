import { describe, expect, it } from 'vitest';
import type { SectionJSON } from '../../types';
import { transformSections } from '../semester-transform';

function makeSectionJSON(overrides: Partial<SectionJSON>): SectionJSON {
  return {
    id: 'sec1',
    courseCode: 'CS101',
    courseName: 'Intro to CS',
    sectionNumber: '001',
    instructor: 'Dr. Smith',
    credits: 3,
    subject: 'CS',
    capacity: 30,
    enrolled: 15,
    timeSlots: [{ day: 'M', startTime: '09:00', endTime: '10:00' }],
    ...overrides,
  };
}

describe('transformSections', () => {
  it('returns empty courses and sections for empty input', () => {
    const result = transformSections([]);
    expect(result.courses).toEqual([]);
    expect(result.sections).toEqual([]);
  });

  it('creates one course and one section for single input', () => {
    const input = [makeSectionJSON({})];
    const result = transformSections(input);

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].id).toBe('CS101');
    expect(result.courses[0].code).toBe('CS101');
    expect(result.courses[0].credits).toBe(3);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].courseId).toBe('CS101');
    expect(result.sections[0].sectionNumber).toBe('001');
  });

  it('deduplicates courses by courseCode', () => {
    const input = [
      makeSectionJSON({ id: 'sec1', sectionNumber: '001' }),
      makeSectionJSON({ id: 'sec2', sectionNumber: '002' }),
    ];
    const result = transformSections(input);

    expect(result.courses).toHaveLength(1);
    expect(result.sections).toHaveLength(2);
  });

  it('creates separate courses for different courseCodes', () => {
    const input = [
      makeSectionJSON({ id: 'sec1', courseCode: 'CS101' }),
      makeSectionJSON({ id: 'sec2', courseCode: 'MATH101' }),
    ];

    const result = transformSections(input);

    expect(result.courses).toHaveLength(2);
    expect(result.sections).toHaveLength(2);
  });

  it('handles sections with empty timeSlots and zero capacity', () => {
    const input: SectionJSON[] = [
      {
        id: 'sec1',
        courseCode: 'CS101',
        courseName: 'Intro',
        sectionNumber: '001',
        instructor: 'Dr. X',
        credits: 3,
        subject: 'CS',
        capacity: 0,
        enrolled: 0,
        timeSlots: [],
      },
    ];

    const result = transformSections(input);

    expect(result.sections[0].capacity).toBe(0);
    expect(result.sections[0].timeSlots).toEqual([]);
  });
});
