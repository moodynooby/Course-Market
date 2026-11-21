import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoPersistence } from '../useAutoPersistence';

describe('useAutoPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces calls to onSave and persists locally immediately', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const persistLocal = vi.fn();
    const { result } = renderHook(() =>
      useAutoPersistence<{ theme: string }>({
        persistLocal,
        onSave,
        debounceMs: 300,
      }),
    );

    result.current.queueSave({ theme: 'dark' });

    expect(persistLocal).toHaveBeenCalledWith({ theme: 'dark' });
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('coalesces rapid updates into single latest payload', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoPersistence<{ count: number }>({
        onSave,
        debounceMs: 300,
      }),
    );

    result.current.queueSave({ count: 1 });
    vi.advanceTimersByTime(100);
    result.current.queueSave({ count: 2 });
    vi.advanceTimersByTime(100);
    result.current.queueSave({ count: 3 });

    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(350);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ count: 3 });
  });

  it('flushes pending changes immediately on unmount', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() =>
      useAutoPersistence<{ value: string }>({
        onSave,
        debounceMs: 500,
      }),
    );

    result.current.queueSave({ value: 'must-not-be-lost' });
    expect(onSave).not.toHaveBeenCalled();

    // Unmounting before debounce window expires
    unmount();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ value: 'must-not-be-lost' });
  });

  it('flushes pending changes on visibilitychange to hidden', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoPersistence<{ value: string }>({
        onSave,
        debounceMs: 1000,
      }),
    );

    result.current.queueSave({ value: 'backgrounded' });
    expect(onSave).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('visibilitychange'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ value: 'backgrounded' });
  });

  it('invokes onError when onSave rejects', async () => {
    const error = new Error('Network failure');
    const onSave = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useAutoPersistence<{ value: string }>({
        onSave,
        onError,
        debounceMs: 100,
      }),
    );

    result.current.queueSave({ value: 'fails' });
    await vi.advanceTimersByTimeAsync(150);

    expect(onError).toHaveBeenCalledWith(error, { value: 'fails' });
  });
});
