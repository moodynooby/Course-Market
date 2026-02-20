import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTrades, createTrade, updateTradeStatus, deleteTrade } from './tradesApi';

vi.mock('../config/devConfig', () => ({
  ENV: {
    NETLIFY_FUNCTION_URL: '',
    IS_DEV: false,
  },
}));

describe('tradesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('error handling', () => {
    it('throws error for non-JSON response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          headers: { get: () => 'text/plain' },
          text: () => Promise.resolve('Not JSON'),
        }),
      ) as unknown as typeof fetch;

      await expect(getTrades()).rejects.toThrow('non-JSON response');
    });

    it('throws error for non-OK response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
          headers: { get: () => 'application/json' },
        }),
      ) as unknown as typeof fetch;

      await expect(getTrades()).rejects.toThrow('API error 500');
    });
  });
});
