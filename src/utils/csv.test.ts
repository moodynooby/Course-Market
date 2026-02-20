import { describe, it, expect } from 'vitest';
import { parseCSV } from './csv';

describe('parseCSV (standard format)', () => {
  it('parses a simple valid CSV into one course and section', () => {
    const csv = [
      'Course Code,Course Name,Section,Instructor,Days,Start Time,End Time,Credits',
      'COM101,Intro to CS,1,Dr. Smith,MWF,09:00,10:00,3',
    ].join('\n');

    const result = parseCSV(csv);

    expect(result.errors).toEqual([]);
    expect(result.courses).toHaveLength(1);
    expect(result.sections).toHaveLength(1);
    expect(result.courses[0].code).toBe('COM101');
    expect(result.sections[0].sectionNumber).toBe('1');
    expect(result.sections[0].timeSlots).not.toHaveLength(0);
  });

  it('returns errors for missing rows', () => {
    const csv = 'course_code,course_name,section\n';
    const result = parseCSV(csv);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
