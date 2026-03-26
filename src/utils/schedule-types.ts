import type { DayOfWeek, Section } from '../types';

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
}

export interface ScheduleCluster {
  id: string;
  label: string;
  schedules: GeneratedSchedule[];
  representative: GeneratedSchedule;
}

/**
 * Intent extracted from natural language query
 */
export interface ScheduleIntent {
  /** Prefer morning classes (before noon) */
  preferMorning?: boolean;
  /** Prefer afternoon classes (after noon) */
  preferAfternoon?: boolean;
  /** Days to avoid */
  avoidDays?: DayOfWeek[];
  /** Earliest acceptable start time (e.g., "10:00") */
  earliestTime?: string;
  /** Latest acceptable end time (e.g., "17:00") */
  latestTime?: string;
  /** Specific days requested (e.g., ["M", "W", "F"]) */
  specificDays?: DayOfWeek[];
  /** Raw query for reference */
  rawQuery?: string;
}

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

/**
 * Schedule ranking from LLM comparison
 */
export interface ScheduleRank {
  /** The schedule */
  schedule: GeneratedSchedule;
  /** Rank position (1 = best) */
  rank: number;
  /** Match score 1-10 */
  matchScore: number;
  /** Explanation of ranking */
  explanation: string;
  /** Key tradeoff vs other options */
  tradeoff: string;
}
