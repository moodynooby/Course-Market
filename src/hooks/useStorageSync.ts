import { useState, useEffect, useCallback, useRef } from 'react';
import { storage, type StorageKey } from '../config/storage';

/**
 * Hook for synchronized localStorage access with React state
 * Handles JSON parsing, cross-tab sync, and debounced writes
 */
export function useStorageSync<T>(
  key: StorageKey,
  defaultValue: T,
  debounceMs: number = 500,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state from localStorage immediately
  const [storedValue, setStoredValue] = useState<T>(() => {
    return storage.get(key, defaultValue);
  });

  // Ref for debounce timeout
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save to localStorage with debouncing
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;

        // Clear existing timeout
        if (writeTimeoutRef.current) {
          clearTimeout(writeTimeoutRef.current);
        }

        // Set up new timeout for debounced write
        writeTimeoutRef.current = setTimeout(() => {
          storage.set(key, newValue);
        }, debounceMs);

        return newValue;
      });
    },
    [key, debounceMs],
  );

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    storage.remove(key);
    setStoredValue(defaultValue);
  }, [key, defaultValue]);

  // Listen for cross-tab changes
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
      }
    };
  }, []);

  return [storedValue, setValue, removeValue];
}
