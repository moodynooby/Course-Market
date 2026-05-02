import { useCallback, useEffect, useRef, useState } from 'react';
import { type StorageKey, storage } from '../utils/storage';

/**
 * Hook for synchronized localStorage access with React state
 * Handles JSON parsing, cross-tab sync, and debounced writes
 */
export function useStorageSync<T>(
  key: StorageKey,
  defaultValue: T,
  debounceMs: number = 500,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return storage.get(key, defaultValue);
  });

  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;

        if (writeTimeoutRef.current) {
          clearTimeout(writeTimeoutRef.current);
        }

        writeTimeoutRef.current = setTimeout(() => {
          storage.set(key, newValue);
        }, debounceMs);

        return newValue;
      });
    },
    [key, debounceMs],
  );

  const removeValue = useCallback(() => {
    storage.remove(key);
    setStoredValue(defaultValue);
  }, [key, defaultValue]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          const parsed = JSON.parse(event.newValue);
          setStoredValue(parsed);
        } catch (error) {
          console.error(`Failed to parse localStorage change for ${key}:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  useEffect(() => {
    return () => {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
      }
    };
  }, []);

  return [storedValue, setValue, removeValue];
}
