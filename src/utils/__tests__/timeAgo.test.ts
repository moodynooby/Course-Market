import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timeAgo } from '../timeAgo';

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for recent times (within 60 seconds)', () => {
    expect(timeAgo(new Date('2025-01-15T12:00:00Z').toISOString())).toBe('Just now');
    expect(timeAgo(new Date('2025-01-15T11:59:30Z').toISOString())).toBe('Just now');
  });

  it('formats minutes correctly', () => {
    expect(timeAgo(new Date('2025-01-15T11:59:00Z').toISOString())).toBe('1m ago');
    expect(timeAgo(new Date('2025-01-15T11:01:00Z').toISOString())).toBe('59m ago');
  });

  it('formats hours correctly', () => {
    expect(timeAgo(new Date('2025-01-15T11:00:00Z').toISOString())).toBe('1h ago');
    expect(timeAgo(new Date('2025-01-14T13:00:00Z').toISOString())).toBe('23h ago');
  });

  it('formats days correctly', () => {
    expect(timeAgo(new Date('2025-01-14T12:00:00Z').toISOString())).toBe('1d ago');
    expect(timeAgo(new Date('2025-01-09T12:00:00Z').toISOString())).toBe('6d ago');
  });

  it('formats weeks correctly', () => {
    expect(timeAgo(new Date('2025-01-08T12:00:00Z').toISOString())).toBe('1w ago');
    expect(timeAgo(new Date('2024-12-25T12:00:00Z').toISOString())).toBe('3w ago');
  });

  it('formats months correctly', () => {
    expect(timeAgo(new Date('2024-12-16T12:00:00Z').toISOString())).toBe('1mo ago');
  });

  it('formats years correctly', () => {
    expect(timeAgo(new Date('2024-01-15T12:00:00Z').toISOString())).toBe('1y ago');
  });

  it('returns "Just now" for future dates', () => {
    expect(timeAgo(new Date('2025-01-16T12:00:00Z').toISOString())).toBe('Just now');
  });
});
