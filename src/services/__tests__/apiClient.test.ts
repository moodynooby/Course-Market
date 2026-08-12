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
});
