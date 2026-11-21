import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeAuthReturnContext,
  getAuthReturnContext,
  resolveStateFrom,
  setAuthReturnContext,
  toSafeRelativeUrl,
} from '../authReturn';

describe('authReturn', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('consumes returnUrl and cleans up sessionStorage', () => {
    setAuthReturnContext('/courses');
    const consumed = consumeAuthReturnContext();
    expect(consumed).toEqual({
      returnUrl: '/courses',
    });
    expect(getAuthReturnContext()).toEqual({
      returnUrl: null,
    });
  });

  it('normalizes router state.from into a path', () => {
    expect(resolveStateFrom({ from: '/dashboard' })).toBe('/dashboard');
    expect(resolveStateFrom({ from: { pathname: '/trading', search: '?tab=offers' } })).toBe(
      '/trading?tab=offers',
    );
    expect(resolveStateFrom({})).toBeNull();
    expect(resolveStateFrom(undefined)).toBeNull();
  });

  it('only allows same-origin relative redirects', () => {
    expect(toSafeRelativeUrl('/courses')).toBe('/courses');
    expect(toSafeRelativeUrl('/courses?x=1')).toBe('/courses?x=1');
    expect(toSafeRelativeUrl('//evil.example')).toBe('/');
    expect(toSafeRelativeUrl('https://evil.example')).toBe('/');
    expect(toSafeRelativeUrl(null)).toBe('/');
    expect(toSafeRelativeUrl(undefined)).toBe('/');
  });
});
