import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../apiClient';
import { getSemesters } from '../coursesApi';

vi.mock('../apiClient', () => ({
  api: { get: vi.fn() },
}));

describe('getSemesters', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retries after a transient request failure', async () => {
    const semesters = [{ id: 'semester-1', name: 'Semester 1', isActive: true }];
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ semesters });

    await expect(getSemesters()).rejects.toThrow('Network unavailable');
    await expect(getSemesters()).resolves.toEqual({ semesters });
  });
});
