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

  it('returns "Just now" for current time', () => {
    expect(timeAgo(new Date('2025-01-15T12:00:00Z').toISOString())).toBe('Just now');
  });

  it('returns "Just now" for 30 seconds ago', () => {
    const date = new Date('2025-01-15T11:59:30Z');
    expect(timeAgo(date.toISOString())).toBe('Just now');
  });

  it('returns "1m ago" for 1 minute ago', () => {
    const date = new Date('2025-01-15T11:59:00Z');
    expect(timeAgo(date.toISOString())).toBe('1m ago');
  });

  it('returns "59m ago" for 59 minutes ago', () => {
    const date = new Date('2025-01-15T11:01:00Z');
    expect(timeAgo(date.toISOString())).toBe('59m ago');
  });

  it('returns "1h ago" for 1 hour ago', () => {
    const date = new Date('2025-01-15T11:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('1h ago');
  });

  it('returns "23h ago" for 23 hours ago', () => {
    const date = new Date('2025-01-14T13:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('23h ago');
  });

  it('returns "1d ago" for 1 day ago', () => {
    const date = new Date('2025-01-14T12:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('1d ago');
  });

  it('returns "6d ago" for 6 days ago', () => {
    const date = new Date('2025-01-09T12:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('6d ago');
  });

  it('returns "1w ago" for 7 days ago', () => {
    const date = new Date('2025-01-08T12:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('1w ago');
  });

  it('returns "3w ago" for 21 days ago', () => {
    const date = new Date('2024-12-25T12:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('3w ago');
  });

  it('returns "1mo ago" for 30 days ago', () => {
    const date = new Date('2024-12-16T12:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('1mo ago');
  });

  it('returns "1y ago" for 365 days ago', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('1y ago');
  });

  it('returns "Just now" for a future date', () => {
    const date = new Date('2025-01-16T12:00:00Z');
    expect(timeAgo(date.toISOString())).toBe('Just now');
  });
});
