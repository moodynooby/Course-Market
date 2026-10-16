import { describe, expect, it } from 'vitest';
import { handler as coursesHandler } from '../courses';
import type { NetlifyEvent } from '../lib/types';

function makeEvent(overrides: Partial<NetlifyEvent> = {}): NetlifyEvent {
  return {
    path: '/.netlify/functions/courses',
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: undefined,
    body: null,
    ...overrides,
  };
}

describe('courses serverless handler', () => {
  it('rejects POST requests with 405 Method Not Allowed', async () => {
    const res = await coursesHandler(makeEvent({ httpMethod: 'POST' }));
    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({ error: 'Method Not Allowed' });
  });

  it('rejects requests missing semesterId with 400', async () => {
    const res = await coursesHandler(makeEvent({ queryStringParameters: {} }));
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Validation failed');
    expect(body.details[0].field).toBe('semesterId');
  });
});
