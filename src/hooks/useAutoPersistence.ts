import { useCallback, useEffect, useRef } from 'react';
import { type StorageKey, storage } from '../utils/storage';

export interface AutoPersistenceOptions<T> {
  /** Optional localStorage key to mirror data synchronously. */
  storageKey?: StorageKey;
  /** Async save function (e.g., API call). */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in milliseconds before dispatching cloud save. Defaults to 300ms. */
  debounceMs?: number;
  /** Optional error callback for rollback or user notifications. */
  onError?: (error: unknown, pendingData: T) => void;
}

export interface AutoPersistenceController<T> {
  /** Schedules a debounced save, immediately updating localStorage if storageKey is configured. */
  queueSave: (data: T) => void;
  /** Immediately dispatches any pending save, bypassing debounce delay. */
  flush: () => Promise<void>;
  /** Cancels any pending scheduled save without dispatching. */
  cancel: () => void;
  /** Returns whether a save is currently pending or in flight. */
  isPending: () => boolean;
}

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Reusable auto-persistence engine with coalesced debouncing, synchronous
 * local storage fallback, and guaranteed flushes on unmount, visibilitychange,
 * and beforeunload.
 */
export function useAutoPersistence<T>({
  storageKey,
  onSave,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onError,
}: AutoPersistenceOptions<T>): AutoPersistenceController<T> {
  const pendingDataRef = useRef<T | null>(null);
  const hasPendingRef = useRef(false);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSaveRef = useRef(onSave);
  const onErrorRef = useRef(onError);
  const storageKeyRef = useRef(storageKey);

  onSaveRef.current = onSave;
  onErrorRef.current = onError;
  storageKeyRef.current = storageKey;

  const executeSave = useCallback(async () => {
    if (!hasPendingRef.current || inFlightRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const dataToSave = pendingDataRef.current;
    hasPendingRef.current = false;
    inFlightRef.current = true;

    try {
      if (dataToSave !== null) {
        await onSaveRef.current(dataToSave);
      }
    } catch (err) {
      if (onErrorRef.current && dataToSave !== null) {
        onErrorRef.current(err, dataToSave);
      }
    } finally {
      inFlightRef.current = false;
      // If new data arrived while the previous save was in flight, save it immediately
      if (hasPendingRef.current) {
        void executeSave();
      }
    }
  }, []);

  const queueSave = useCallback(
    (data: T) => {
      pendingDataRef.current = data;
      hasPendingRef.current = true;

      if (storageKeyRef.current) {
        storage.set(storageKeyRef.current, data);
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void executeSave();
      }, debounceMs);
    },
    [debounceMs, executeSave],
  );

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (hasPendingRef.current) {
      await executeSave();
    }
  }, [executeSave]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    hasPendingRef.current = false;
    pendingDataRef.current = null;
  }, []);

  const isPending = useCallback(() => {
    return hasPendingRef.current || inFlightRef.current;
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      }
    };

    const handleBeforeUnload = () => {
      void flush();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void flush();
    };
  }, [flush]);

  return { queueSave, flush, cancel, isPending };
}
