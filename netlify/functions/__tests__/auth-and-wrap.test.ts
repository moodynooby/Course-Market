import { describe, expect, it } from 'vitest';
import { AuthError, validateToken } from '../lib/auth';
import type { NetlifyEvent } from '../lib/types';
import { withAuth, withCors } from '../lib/wrap';

function makeEvent(overrides: Partial<NetlifyEvent> = {}): NetlifyEvent {
  return {
    path: '/.netlify/functions/test',
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: undefined,
    body: null,
    ...overrides,
  };
}

describe('withCors', () => {
  it('intercepts OPTIONS preflight and returns 204 with CORS headers', async () => {
    const handler = withCors(async () => ({
      statusCode: 200,
      headers: {},
      body: JSON.stringify({ ok: true }),
    }));

    const response = await handler(makeEvent({ httpMethod: 'OPTIONS' }));

    expect(response.statusCode).toBe(200);
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(response.headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });

  it('translates AuthError to 401 Unauthorized', async () => {
    const handler = withCors(async () => {
      throw new AuthError('Bad token');
    });

    const response = await handler(makeEvent({ httpMethod: 'GET' }));

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
  });

  it('masks unexpected errors with secure 500 response', async () => {
    const handler = withCors(async () => {
      throw new Error('Database password was incorrect in connection string');
    });

    const response = await handler(makeEvent({ httpMethod: 'GET' }));

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).not.toContain('Database password');
  });
});

describe('withAuth', () => {
  it('rejects requests missing authorization header with 401', async () => {
    const handler = withAuth(async () => ({
      statusCode: 200,
      headers: {},
      body: JSON.stringify({ ok: true }),
    }));

    const response = await handler(makeEvent({ headers: {} }));

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
  });

  it('rejects non-Bearer authorization headers with 401', async () => {
    const handler = withAuth(async () => ({
      statusCode: 200,
      headers: {},
      body: JSON.stringify({ ok: true }),
    }));

    const response = await handler(makeEvent({ headers: { authorization: 'Basic dXNlcjpwYXNz' } }));

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
  });
});

describe('validateToken', () => {
  it('throws AuthError when authorization header is absent', async () => {
    await expect(validateToken(undefined)).rejects.toBeInstanceOf(AuthError);
  });

  it('throws AuthError when token does not start with Bearer', async () => {
    await expect(validateToken('Token 12345')).rejects.toBeInstanceOf(AuthError);
  });
});
