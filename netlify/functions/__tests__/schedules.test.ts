import { describe, expect, it } from 'vitest';
import type { NetlifyEvent } from '../lib/types';
import { handler as schedulesHandler } from '../schedules';

function makeEvent(overrides: Partial<NetlifyEvent> = {}): NetlifyEvent {
  return {
    path: '/.netlify/functions/schedules',
    httpMethod: 'POST',
    headers: {},
    queryStringParameters: undefined,
    body: null,
    ...overrides,
  };
}

const mockCourses = [
  {
    id: 'course-1',
    code: 'CSE 101',
    name: 'Introduction to Computer Science',
    subject: 'CSE',
    credits: 3,
  },
  {
    id: 'course-2',
    code: 'MTH 201',
    name: 'Linear Algebra',
    subject: 'MTH',
    credits: 3,
  },
];

const mockSections = [
  {
    id: 'sec-1',
    courseId: 'course-1',
    sectionNumber: '01',
    instructor: 'Dr. Turing',
    capacity: 30,
    enrolled: 15,
    timeSlots: [
      {
        day: 'M' as const,
        startTime: '09:00',
        endTime: '10:15',
      },
    ],
  },
  {
    id: 'sec-2',
    courseId: 'course-2',
    sectionNumber: '01',
    instructor: 'Dr. Gauss',
    capacity: 30,
    enrolled: 20,
    timeSlots: [
      {
        day: 'M' as const,
        startTime: '11:00',
        endTime: '12:15',
      },
    ],
  },
];

describe('schedules serverless handler', () => {
  it('rejects GET requests with 405 Method Not Allowed', async () => {
    const res = await schedulesHandler(makeEvent({ httpMethod: 'GET' }));
    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({ error: 'Method Not Allowed' });
  });

  it('rejects invalid JSON payloads with 400', async () => {
    const res = await schedulesHandler(makeEvent({ httpMethod: 'POST', body: 'not-valid-json' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('Invalid JSON');
  });

  it('rejects missing required fields with 400 and validation details', async () => {
    const res = await schedulesHandler(makeEvent({ httpMethod: 'POST', body: JSON.stringify({}) }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('Validation failed');
  });

  it('generates schedules for valid courses, sections, and preferences', async () => {
    const res = await schedulesHandler(
      makeEvent({
        httpMethod: 'POST',
        path: '/.netlify/functions/schedules/generate',
        body: JSON.stringify({
          courses: mockCourses,
          sections: mockSections,
          preferences: {
            minCredits: 3,
            maxCredits: 18,
            preferredDays: [],
            avoidDays: [],
            timeRange: { start: '08:00', end: '20:00' },
          },
          options: {
            maxSchedules: 10,
          },
        }),
      }),
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.schedules).toBeDefined();
    expect(Array.isArray(body.schedules)).toBe(true);
    expect(body.schedules.length).toBeGreaterThan(0);
    expect(body.schedules[0].sections.length).toBe(2);
    expect(body.schedules[0].totalCredits).toBe(6);
  });

  it('returns empty list and diagnostics when constraints cannot be satisfied', async () => {
    const conflictingSections = [
      {
        ...mockSections[0],
        timeSlots: [{ day: 'M' as const, startTime: '09:00', endTime: '10:00' }],
      },
      {
        ...mockSections[1],
        timeSlots: [{ day: 'M' as const, startTime: '09:00', endTime: '10:00' }],
      },
    ];

    const res = await schedulesHandler(
      makeEvent({
        httpMethod: 'POST',
        path: '/.netlify/functions/schedules',
        body: JSON.stringify({
          courses: mockCourses,
          sections: conflictingSections,
          preferences: {
            minCredits: 6,
            maxCredits: 18,
          },
        }),
      }),
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.schedules).toEqual([]);
    expect(body.diagnostics).toBeDefined();
    expect(body.diagnostics.hasIssues).toBe(true);
  });
});
