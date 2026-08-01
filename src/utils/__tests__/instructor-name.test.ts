import { describe, expect, it } from 'vitest';
import { splitInstructorNames } from '../instructor-name';

describe('splitInstructorNames', () => {
  it('splits on comma (upstream data uses comma between instructors)', () => {
    expect(splitInstructorNames('Smith, Doe')).toEqual(['Smith', 'Doe']);
  });

  it('splits on comma with more than two instructors', () => {
    expect(splitInstructorNames('Smith, Doe, Roe')).toEqual(['Smith', 'Doe', 'Roe']);
  });

  it('preserves Mc/Mac/De prefixes (camelCase splitter was dropped)', () => {
    expect(splitInstructorNames('McDonald')).toEqual(['McDonald']);
    expect(splitInstructorNames('MacGregor')).toEqual(['MacGregor']);
    expect(splitInstructorNames('DeMarco')).toEqual(['DeMarco']);
  });

  it('splits on ampersand', () => {
    expect(splitInstructorNames('Doe & Roe')).toEqual(['Doe', 'Roe']);
  });

  it('splits on the word "and"', () => {
    expect(splitInstructorNames('Doe and Roe')).toEqual(['Doe', 'Roe']);
  });

  it('splits on semicolon', () => {
    expect(splitInstructorNames('Smith; Doe')).toEqual(['Smith', 'Doe']);
  });

  it('mixed separators still split cleanly', () => {
    expect(splitInstructorNames('Smith, Doe & Roe')).toEqual(['Smith', 'Doe', 'Roe']);
  });

  it('does not treat "and" inside a longer word as a separator', () => {
    expect(splitInstructorNames('Anderson')).toEqual(['Anderson']);
    expect(splitInstructorNames('Sandberg')).toEqual(['Sandberg']);
  });

  it('drops placeholder names', () => {
    expect(splitInstructorNames('TBA')).toEqual([]);
    expect(splitInstructorNames('Not added')).toEqual([]);
    expect(splitInstructorNames('To Be Announced')).toEqual([]);
  });

  it('deduplicates repeats', () => {
    expect(splitInstructorNames('Doe, Doe')).toEqual(['Doe']);
  });

  it('trims and normalizes whitespace', () => {
    expect(splitInstructorNames('  Smith  ,  Doe  ')).toEqual(['Smith', 'Doe']);
  });

  it('returns empty for empty input', () => {
    expect(splitInstructorNames('')).toEqual([]);
  });
});
