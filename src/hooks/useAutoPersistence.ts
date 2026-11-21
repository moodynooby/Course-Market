import { useCallback, useEffect, useRef } from 'react';

export interface AutoPersistenceOptions<T> {
  /** Writes the latest data synchronously before the debounced save. */
  persistLocal?: (data: T) => void;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  onError?: (error: unknown, pendingData: T) => void;
}

export interface AutoPersistenceController<T> {
  queueSave: (data: T) => void;
  flush: () => Promise<void>;
}

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Reusable auto-persistence engine with coalesced debouncing, synchronous
 * local storage fallback, and guaranteed flushes on unmount, visibilitychange,
 * and beforeunload.
 */
export function useAutoPersistence<T>({
  persistLocal,
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
  const persistLocalRef = useRef(persistLocal);

  onSaveRef.current = onSave;
  onErrorRef.current = onError;
  persistLocalRef.current = persistLocal;

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
      if (hasPendingRef.current) {
        void executeSave();
      }
    }
  }, []);

  const queueSave = useCallback(
    (data: T) => {
      pendingDataRef.current = data;
      hasPendingRef.current = true;

      persistLocalRef.current?.(data);

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

  return { queueSave, flush };
}
