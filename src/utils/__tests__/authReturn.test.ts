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
