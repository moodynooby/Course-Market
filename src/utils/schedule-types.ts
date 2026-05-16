import type { Section } from '../types';

export interface GeneratedSchedule {
  id: string;
  sections: Section[];
  totalCredits: number;
  score: number;
  conflicts: string[];
}

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
