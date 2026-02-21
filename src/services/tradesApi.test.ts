import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTrades, createTrade, updateTrade, deleteTrade } from './tradesApi';

vi.mock('../config/devConfig', () => ({
  ENV: {
    NETLIFY_FUNCTION_URL: '',
    IS_DEV: false,
  },
}));

const mockToken = 'test-jwt-token';

describe('tradesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTrades', () => {
    it('fetches trades with authorization header', async () => {
      const mockTrades = [
        { id: '1', courseCode: 'CS101', sectionOffered: 'A', sectionWanted: 'B' },
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ trades: mockTrades }),
        }),
      ) as unknown as typeof fetch;

      const result = await getTrades(mockToken);

      expect(fetch).toHaveBeenCalledWith(
        '/.netlify/functions/trades',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
      expect(result).toEqual(mockTrades);
    });

    it('throws error for non-OK response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        }),
      ) as unknown as typeof fetch;

      await expect(getTrades(mockToken)).rejects.toThrow('API error 401');
    });
  });

  describe('createTrade', () => {
    it('creates trade with authorization header', async () => {
      const tradeData = {
        courseCode: 'CS101',
        courseName: 'Intro to CS',
        sectionOffered: 'A',
        sectionWanted: 'B',
        action: 'offer' as const,
      };

      const mockCreatedTrade = { id: '1', ...tradeData, status: 'open' };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ trade: mockCreatedTrade }),
        }),
      ) as unknown as typeof fetch;

      const result = await createTrade(mockToken, tradeData);

      expect(fetch).toHaveBeenCalledWith(
        '/.netlify/functions/trades',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify(tradeData),
        }),
      );
      expect(result).toEqual(mockCreatedTrade);
    });
  });

  describe('updateTrade', () => {
    it('updates trade with authorization header', async () => {
      const updates = { status: 'pending' as const, description: 'Updated' };
      const mockUpdatedTrade = {
        id: '1',
        courseCode: 'CS101',
        status: 'pending',
        description: 'Updated',
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ trade: mockUpdatedTrade }),
        }),
      ) as unknown as typeof fetch;

      const result = await updateTrade(mockToken, '1', updates);

      expect(fetch).toHaveBeenCalledWith(
        '/.netlify/functions/trades/1',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify(updates),
        }),
      );
      expect(result).toEqual(mockUpdatedTrade);
    });
  });

  describe('deleteTrade', () => {
    it('deletes trade with authorization header', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }),
      ) as unknown as typeof fetch;

      await deleteTrade(mockToken, '1');

      expect(fetch).toHaveBeenCalledWith(
        '/.netlify/functions/trades/1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
    });

    it('throws error for non-OK response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          text: () => Promise.resolve('Forbidden'),
        }),
      ) as unknown as typeof fetch;

      await expect(deleteTrade(mockToken, '1')).rejects.toThrow('API error 403');
    });
  });
});
