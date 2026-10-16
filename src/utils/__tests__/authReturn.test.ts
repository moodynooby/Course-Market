import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeAuthReturnContext,
  getAuthReturnContext,
  setAuthReturnContext,
} from '../authReturn';

describe('authReturn', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('stores and retrieves returnUrl', () => {
    setAuthReturnContext('/trading?tradeId=5');
    expect(getAuthReturnContext()).toEqual({
      returnUrl: '/trading?tradeId=5',
    });
  });

  it('returns null when nothing is stored', () => {
    expect(getAuthReturnContext()).toEqual({
      returnUrl: null,
    });
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
});
