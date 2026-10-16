import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../apiClient';

describe('apiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns undefined for successful no-content responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiClient<void>('/health')).resolves.toBeUndefined();
  });

  it('normalizes structured API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'Validation failed',
            code: 'INVALID_INPUT',
            details: [{ field: 'email', message: 'Required' }],
          }),
          { status: 422, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(apiClient('/profile')).rejects.toEqual(
      expect.objectContaining({
        status: 422,
        message: 'Validation failed',
        code: 'INVALID_INPUT',
      }),
    );
  });

  it('attaches Bearer token when provided in options', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal('fetch', mockFetch);

    await apiClient('/secure-data', { token: 'mock-jwt-token' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token',
        }),
      }),
    );
  });

  it('converts request timeout to 408 TIMEOUT error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }),
    );

    await expect(apiClient('/long-running', { timeoutMs: 10 })).rejects.toEqual(
      expect.objectContaining({
        status: 408,
        code: 'TIMEOUT',
      }),
    );
  });
});
