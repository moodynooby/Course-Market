import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  formatZodError,
  llmRequestSchema,
  phoneSchema,
  professorRatingSchema,
  tradeSchema,
  tradeUpdateSchema,
  userProfileSchema,
  userProfileUpdateSchema,
} from '../validation';

describe('phoneSchema', () => {
  it('accepts a valid 10-digit phone', () => {
    expect(phoneSchema.parse('1234567890')).toBe('1234567890');
  });

  it('strips non-digit characters', () => {
    expect(phoneSchema.parse('(123) 456-7890')).toBe('1234567890');
  });

  it('strips non-digits preserving valid digits', () => {
    expect(phoneSchema.parse('(123) 456-7890')).toBe('1234567890');
  });

  it('rejects phone with fewer than 10 digits', () => {
    expect(() => phoneSchema.parse('123456789')).toThrow();
  });

  it('rejects phone with more than 15 digits', () => {
    expect(() => phoneSchema.parse('1'.repeat(16))).toThrow();
  });
});

describe('tradeSchema', () => {
  it('accepts a valid trade', () => {
    const result = tradeSchema.parse({
      courseCode: 'CS101',
      sectionOffered: '001',
      sectionWanted: '002',
    });
    expect(result.courseCode).toBe('CS101');
  });

  it('accepts trade with optional fields', () => {
    const result = tradeSchema.parse({
      courseCode: 'CS101',
      courseName: 'Intro to CS',
      sectionOffered: '001',
      sectionWanted: '002',
      description: 'Looking to swap',
    });
    expect(result.description).toBe('Looking to swap');
  });

  it('rejects trade with empty courseCode', () => {
    expect(() =>
      tradeSchema.parse({
        courseCode: '',
        sectionOffered: '001',
        sectionWanted: '002',
      }),
    ).toThrow();
  });

  it('rejects trade with missing sectionOffered', () => {
    expect(() =>
      tradeSchema.parse({
        courseCode: 'CS101',
        sectionWanted: '002',
      }),
    ).toThrow();
  });

  it('rejects trade with too long courseCode', () => {
    expect(() =>
      tradeSchema.parse({
        courseCode: 'A'.repeat(51),
        sectionOffered: '001',
        sectionWanted: '002',
      }),
    ).toThrow();
  });
});

describe('tradeUpdateSchema', () => {
  it('accepts partial update', () => {
    const result = tradeUpdateSchema.parse({ status: 'filled' });
    expect(result.status).toBe('filled');
  });

  it('accepts multiple fields', () => {
    const result = tradeUpdateSchema.parse({
      sectionOffered: '003',
      status: 'cancelled',
    });
    expect(result.sectionOffered).toBe('003');
    expect(result.status).toBe('cancelled');
  });

  it('rejects empty object', () => {
    expect(() => tradeUpdateSchema.parse({})).toThrow('At least one field must be provided');
  });

  it('rejects invalid status', () => {
    expect(() => tradeUpdateSchema.parse({ status: 'invalid' })).toThrow();
  });
});

describe('userProfileSchema', () => {
  it('accepts valid profile with phone only', () => {
    const result = userProfileSchema.parse({ phone: '1234567890' });
    expect(result.phone).toBe('1234567890');
  });

  it('accepts profile with all fields', () => {
    const result = userProfileSchema.parse({
      phone: '1234567890',
      semesterId: 'winter2025',
      preferences: { maxCredits: 18 },
      courseSelections: { CS101: '001' },
      llmConfig: { provider: 'groq' },
    });
    expect(result.semesterId).toBe('winter2025');
  });

  it('rejects profile with invalid phone', () => {
    expect(() => userProfileSchema.parse({ phone: '123' })).toThrow();
  });
});

describe('userProfileUpdateSchema', () => {
  it('accepts partial update with single field', () => {
    const result = userProfileUpdateSchema.parse({ semesterId: 'spring2025' });
    expect(result.semesterId).toBe('spring2025');
  });

  it('accepts empty object', () => {
    const result = userProfileUpdateSchema.parse({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('llmRequestSchema', () => {
  it('accepts valid request', () => {
    const result = llmRequestSchema.parse({
      provider: 'groq',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(result.provider).toBe('groq');
  });

  it('accepts request with all options', () => {
    const result = llmRequestSchema.parse({
      provider: 'groq',
      model: 'llama-3.3-70b',
      messages: [{ role: 'system', content: 'You are helpful' }],
      temperature: 0.5,
      maxOutputTokens: 1000,
    });
    expect(result.temperature).toBe(0.5);
  });

  it('rejects invalid provider', () => {
    expect(() =>
      llmRequestSchema.parse({
        provider: 'openai',
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    ).toThrow();
  });

  it('rejects empty messages', () => {
    expect(() =>
      llmRequestSchema.parse({
        provider: 'groq',
        messages: [],
      }),
    ).toThrow();
  });

  it('rejects invalid message role', () => {
    expect(() =>
      llmRequestSchema.parse({
        provider: 'groq',
        messages: [{ role: 'admin', content: 'Hi' }],
      }),
    ).toThrow();
  });

  it('rejects temperature out of range', () => {
    expect(() =>
      llmRequestSchema.parse({
        provider: 'groq',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 3,
      }),
    ).toThrow();
  });
});

describe('professorRatingSchema', () => {
  it('accepts valid rating', () => {
    const result = professorRatingSchema.parse({
      professorId: 1,
      rating: 4,
      difficulty: 3,
      comment: 'Great professor! Really enjoyed the class.',
      courseCode: 'CS101',
      semesterId: 'winter2025',
      takeAgain: true,
    });
    expect(result.rating).toBe(4);
  });

  it('defaults takeAgain to true', () => {
    const result = professorRatingSchema.parse({
      professorId: 1,
      rating: 5,
      difficulty: 2,
      comment: 'Excellent course, well taught.',
      courseCode: 'CS101',
      semesterId: 'winter2025',
    });
    expect(result.takeAgain).toBe(true);
  });

  it('rejects rating below 1', () => {
    expect(() =>
      professorRatingSchema.parse({
        professorId: 1,
        rating: 0,
        difficulty: 3,
        comment: 'Not great, not terrible.',
        courseCode: 'CS101',
        semesterId: 'winter2025',
      }),
    ).toThrow();
  });

  it('rejects rating above 5', () => {
    expect(() =>
      professorRatingSchema.parse({
        professorId: 1,
        rating: 6,
        difficulty: 3,
        comment: 'Best professor ever!',
        courseCode: 'CS101',
        semesterId: 'winter2025',
      }),
    ).toThrow();
  });

  it('rejects comment shorter than 10 characters', () => {
    expect(() =>
      professorRatingSchema.parse({
        professorId: 1,
        rating: 3,
        difficulty: 3,
        comment: 'Too short',
        courseCode: 'CS101',
        semesterId: 'winter2025',
      }),
    ).toThrow();
  });

  it('rejects comment with only non-letter characters', () => {
    expect(() =>
      professorRatingSchema.parse({
        professorId: 1,
        rating: 3,
        difficulty: 3,
        comment: '..........',
        courseCode: 'CS101',
        semesterId: 'winter2025',
      }),
    ).toThrow();
  });

  it('rejects non-positive professorId', () => {
    expect(() =>
      professorRatingSchema.parse({
        professorId: 0,
        rating: 3,
        difficulty: 3,
        comment: 'Decent enough course.',
        courseCode: 'CS101',
        semesterId: 'winter2025',
      }),
    ).toThrow();
  });
});

describe('formatZodError', () => {
  it('formats a ZodError into structured response', () => {
    const schema = z.object({ name: z.string().min(1) });
    try {
      schema.parse({ name: '' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const result = formatZodError(error);
        expect(result).toEqual({
          error: 'Validation failed',
          details: [{ field: 'name', message: expect.any(String) }],
        });
      }
    }
  });

  it('handles nested field paths', () => {
    const schema = z.object({ nested: z.object({ value: z.number() }) });
    try {
      schema.parse({ nested: { value: 'not-a-number' } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const result = formatZodError(error);
        expect(result.details[0].field).toBe('nested.value');
      }
    }
  });
});
