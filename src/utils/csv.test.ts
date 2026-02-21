import { describe, it, expect } from 'vitest';
import { parseCSV, extractSubject } from './csv';

describe('csv', () => {
  it('parses valid CSV', () => {
    const csv =
      'Course Code,Course Name,Section,Instructor,Days,Start Time,End Time,Credits\nCOM101,Intro,1,Smith,MWF,09:00,10:00,3';
    const result = parseCSV(csv);

    expect(result.courses.length).toBeGreaterThan(0);
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('handles missing headers', () => {
    const csv = 'Course Code,Course Name\nCOM101,Intro';
    const result = parseCSV(csv);

    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('extracts subject from code', () => {
    expect(extractSubject('COM101')).toBe('COM');
    expect(extractSubject('MATH 201')).toBe('MATH');
  });
});
