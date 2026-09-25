import type { Schedule } from '../types';

export type GeneratedSchedule = Schedule;

export interface GeneratorOptions {
  maxSchedules?: number;
  onProgress?: (count: number) => void;
  signal?: AbortSignal;
}

export const DEFAULT_MAX_SCHEDULES = 1000;

/**
 * Result of natural language search
 */
export interface SearchResult {
  /** The matched schedule */
  schedule: GeneratedSchedule;
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** Which criteria matched */
  matchedCriteria: string[];
  /** Explanation of why it matched */
  explanation?: string;
}
