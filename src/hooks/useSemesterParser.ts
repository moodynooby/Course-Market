import { useCallback, useEffect, useRef, useState } from 'react';
import type { Course, Section } from '../types';

interface ParseResult {
  semesterId: string;
  semesterName: string;
  version: string;
  courses: Course[];
  sections: Section[];
  metadata: {
    totalSections: number;
    totalCourses: number;
    subjects: string[];
    creditsRange: {
      min: number;
      max: number;
    };
  };
  parseTime: number;
}

interface ParseProgress {
  progress: number;
  message: string;
}

interface ParseError {
  error: string;
  message: string;
}

/**
 * Hook to manage Web Worker for semester JSON parsing
 * Provides non-blocking parsing with progress updates
 */
export function useSemesterParser() {
  const workerRef = useRef<Worker | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<ParseError | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/semesterParser.worker.ts', import.meta.url),
      { type: 'module' },
    );

    // Handle worker messages
    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      if (type === 'PARSE_PROGRESS') {
        setProgress(payload);
      } else if (type === 'PARSE_SUCCESS') {
        setResult(payload);
        setIsParsing(false);
        setProgress({ progress: 100, message: 'Complete!' });
      } else if (type === 'PARSE_ERROR') {
        setError(payload);
        setIsParsing(false);
        setProgress(null);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  /**
   * Parse JSON text using worker
   */
  const parseJSON = useCallback((jsonText: string, semesterId: string) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    setIsParsing(true);
    setProgress({ progress: 0, message: 'Starting...' });
    setResult(null);
    setError(null);

    workerRef.current.postMessage({
      type: 'PARSE_JSON',
      payload: { jsonText, semesterId },
    });
  }, []);

  /**
   * Fetch and parse JSON from URL using worker
   */
  const fetchAndParse = useCallback((url: string, semesterId: string, semesterName: string) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    setIsParsing(true);
    setProgress({ progress: 0, message: 'Starting...' });
    setResult(null);
    setError(null);

    workerRef.current.postMessage({
      type: 'FETCH_AND_PARSE',
      payload: { url, semesterId, semesterName },
    });
  }, []);

  /**
   * Reset parser state
   */
  const reset = useCallback(() => {
    setIsParsing(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    isParsing,
    progress,
    result,
    error,
    parseJSON,
    fetchAndParse,
    reset,
  };
}
