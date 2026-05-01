import * as chrono from 'chrono-node';
import { searchSchedules } from '../services/search';
import type { DayOfWeek } from '../types';
import { timeToMinutesCached } from './schedule';
import type { GeneratedSchedule, ScheduleIntent, SearchResult } from './schedule-types';

/**
 * Day name mappings for normalization
 */
const DAY_MAPPINGS: Record<string, DayOfWeek> = {
  // Full names
  monday: 'M',
  tuesday: 'T',
  wednesday: 'W',
  thursday: 'Th',
  friday: 'F',
  saturday: 'Sa',
  sunday: 'Su',
  // Abbreviations
  mon: 'M',
  tue: 'T',
  wed: 'W',
  thu: 'Th',
  fri: 'F',
  sat: 'Sa',
  sun: 'Su',
  // Common patterns
  mwf: 'M', // Will be split
  m: 'M',
  t: 'T',
  w: 'W',
  th: 'Th',
  f: 'F',
};

/**
 * Regex patterns for intent extraction
 */
const PATTERNS = {
  // Time preferences
  morning: /\b(morning|am|before noon|early)\b/i,
  afternoon: /\b(afternoon|pm|after noon|late)\b/i,
  evening: /\b(evening|night)\b/i,

  // Negation patterns
  avoid: /\b(avoid|no|without|exclude|except)\b/i,
  prefer: /\b(prefer|want|need|like|looking for)\b/i,

  // Day patterns
  daysFull: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  daysShort: /\b(mon|tue|wed|thu|fri|sat|sun)\b/gi,
  dayCombo: /\b(mwf|tth|mwf|tt)\b/gi,
  singleLetters: /\b([MTWF]|Th)\b/g,

  // Time patterns
  timeRange: /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
  startTime: /\b(start|begin|after|from)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
  endTime: /\b(end|finish|before|by|until)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
  timeOnly: /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,

  // Credit patterns
  credits: /\b(\d+)\s*credits?\b/i,

  // Compactness
  compact: /\b(compact|consecutive|back-to-back|minimal gaps?)\b/i,
  spread: /\b(spread out|spread|gaps?|breaks?)\b/i,
};

/**
 * Parse time string to 24-hour format
 */
function parseTimeTo24Hour(hour: number, minute: number = 0, period?: string): string {
  let hour24 = hour;

  if (period) {
    const periodLower = period.toLowerCase();
    if (periodLower === 'pm' && hour < 12) {
      hour24 += 12;
    } else if (periodLower === 'am' && hour === 12) {
      hour24 = 0;
    }
  }

  return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Extract day preferences from query
 */
function parseDays(query: string): {
  preferDays?: DayOfWeek[];
  avoidDays?: DayOfWeek[];
} {
  const days: DayOfWeek[] = [];
  const avoidDays: DayOfWeek[] = [];

  // Check for negation context
  const _avoidMatch = PATTERNS.avoid.test(query);
  const _preferMatch = PATTERNS.prefer.test(query);

  // Extract full day names
  const fullDays = query.match(PATTERNS.daysFull);
  if (fullDays) {
    fullDays.forEach((day) => {
      const normalized = DAY_MAPPINGS[day.toLowerCase()];
      if (normalized) days.push(normalized);
    });
  }

  // Extract short day names
  const shortDays = query.match(PATTERNS.daysShort);
  if (shortDays) {
    shortDays.forEach((day) => {
      const normalized = DAY_MAPPINGS[day.toLowerCase()];
      if (normalized && !days.includes(normalized)) {
        days.push(normalized);
      }
    });
  }

  // Extract day combinations like MWF, TTh
  const combos = query.match(PATTERNS.dayCombo);
  if (combos) {
    combos.forEach((combo) => {
      const comboLower = combo.toLowerCase();
      if (comboLower === 'mwf') {
        ['M', 'W', 'F'].forEach((d) => {
          if (!days.includes(d as DayOfWeek)) days.push(d as DayOfWeek);
        });
      } else if (comboLower === 'tth' || comboLower === 'tt') {
        ['T', 'Th'].forEach((d) => {
          if (!days.includes(d as DayOfWeek)) days.push(d as DayOfWeek);
        });
      }
    });
  }

  // Extract single letters (M, T, W, Th, F)
  const singleLetters = query.match(PATTERNS.singleLetters);
  if (singleLetters) {
    singleLetters.forEach((letter) => {
      const normalized = DAY_MAPPINGS[letter.toLowerCase()];
      if (normalized && !days.includes(normalized)) {
        days.push(normalized);
      }
    });
  }

  // Determine if days are preferred or avoided
  const hasNegation = PATTERNS.avoid.test(query) || /\bno\s+\w+\b/i.test(query);

  if (hasNegation) {
    // Check which days are in negation context
    const negationPattern = /\b(no|avoid)\s+([a-z]+)\b/gi;
    let match;
    while ((match = negationPattern.exec(query)) !== null) {
      const dayStr = match[2].toLowerCase();
      const normalized = DAY_MAPPINGS[dayStr];
      if (normalized && !avoidDays.includes(normalized)) {
        avoidDays.push(normalized);
      }
    }
    return { avoidDays: avoidDays.length > 0 ? avoidDays : undefined };
  }

  return { preferDays: days.length > 0 ? days : undefined };
}

/**
 * Extract time constraints using chrono-node and regex
 */
function parseTimeConstraints(query: string): {
  earliestTime?: string;
  latestTime?: string;
  preferMorning?: boolean;
  preferAfternoon?: boolean;
} {
  const result: {
    earliestTime?: string;
    latestTime?: string;
    preferMorning?: boolean;
    preferAfternoon?: boolean;
  } = {};

  // Check for morning/afternoon preferences
  if (PATTERNS.morning.test(query)) {
    result.preferMorning = true;
  }
  if (PATTERNS.afternoon.test(query)) {
    result.preferAfternoon = true;
  }

  // Use chrono-node for sophisticated date/time parsing
  const chronoResults = chrono.parse(query, new Date(), {
    forwardDate: false,
  });

  for (const chronoResult of chronoResults) {
    const start = chronoResult.start;
    const end = chronoResult.end;

    // Extract hour information
    if (start.isCertain('hour')) {
      const startHour = start.get('hour') || 0;
      const startMinute = start.get('minute') || 0;

      if (PATTERNS.startTime.test(query) || /after|from|start/i.test(query)) {
        result.earliestTime = parseTimeTo24Hour(startHour, startMinute);
      }

      if (PATTERNS.endTime.test(query) || /before|by|end|until/i.test(query)) {
        result.latestTime = parseTimeTo24Hour(startHour, startMinute);
      }
    }

    // Check for time ranges
    if (start.isCertain('hour') && end?.isCertain('hour')) {
      const startHour = start.get('hour') || 0;
      const endHour = end.get('hour') || 0;

      if (!result.earliestTime) {
        result.earliestTime = parseTimeTo24Hour(startHour, start.get('minute') || 0);
      }
      if (!result.latestTime) {
        result.latestTime = parseTimeTo24Hour(endHour, end.get('minute') || 0);
      }
    }
  }

  // Fallback to regex patterns
  if (!result.earliestTime) {
    const startMatch = query.match(PATTERNS.startTime);
    if (startMatch) {
      const hour = parseInt(startMatch[2], 10);
      const minute = startMatch[3] ? parseInt(startMatch[3], 10) : 0;
      const period = startMatch[4];
      result.earliestTime = parseTimeTo24Hour(hour, minute, period);
    }
  }

  if (!result.latestTime) {
    const endMatch = query.match(PATTERNS.endTime);
    if (endMatch) {
      const hour = parseInt(endMatch[2], 10);
      const minute = endMatch[3] ? parseInt(endMatch[3], 10) : 0;
      const period = endMatch[4];
      result.latestTime = parseTimeTo24Hour(hour, minute, period);
    }
  }

  return result;
}

/**
 * Extract complete intent from natural language query
 */
export function extractScheduleIntent(query: string): ScheduleIntent {
  const intent: ScheduleIntent = {
    rawQuery: query,
  };

  // Parse days
  const { preferDays, avoidDays } = parseDays(query);
  if (preferDays && preferDays.length > 0) {
    intent.specificDays = preferDays;
  }
  if (avoidDays && avoidDays.length > 0) {
    intent.avoidDays = avoidDays;
  }

  // Parse time constraints
  const timeConstraints = parseTimeConstraints(query);
  if (timeConstraints.preferMorning) {
    intent.preferMorning = true;
  }
  if (timeConstraints.preferAfternoon) {
    intent.preferAfternoon = true;
  }
  if (timeConstraints.earliestTime) {
    intent.earliestTime = timeConstraints.earliestTime;
  }
  if (timeConstraints.latestTime) {
    intent.latestTime = timeConstraints.latestTime;
  }

  return intent;
}

/**
 * Filter and rank schedules by natural language query
 */
export function searchSchedulesByIntent(
  query: string,
  schedules: GeneratedSchedule[],
): SearchResult[] {
  if (!query.trim()) {
    // Return all schedules with neutral score if no query
    return schedules.map((schedule) => ({
      schedule,
      relevanceScore: 1,
      matchedCriteria: ['No filter applied'],
      explanation: 'Showing all schedules',
    }));
  }

  const intent = extractScheduleIntent(query);
  const searchResults = searchSchedules(schedules, query);

  // Post-filter by hard constraints
  return searchResults.filter((result) => {
    const { schedule } = result;

    // Check avoidDays
    if (intent.avoidDays && intent.avoidDays.length > 0) {
      const hasAvoidedDays = schedule.sections.some((sec) =>
        sec.timeSlots.some((ts) => intent.avoidDays?.includes(ts.day)),
      );
      if (hasAvoidedDays) return false;
    }

    // Check earliestTime
    if (intent.earliestTime) {
      const earliestMinutes = timeToMinutesCached(intent.earliestTime);
      const hasEarlyClass = schedule.sections.some((sec) =>
        sec.timeSlots.some((ts) => timeToMinutesCached(ts.startTime) < earliestMinutes),
      );
      if (hasEarlyClass) return false;
    }

    // Check latestTime
    if (intent.latestTime) {
      const latestMinutes = timeToMinutesCached(intent.latestTime);
      const hasLateClass = schedule.sections.some((sec) =>
        sec.timeSlots.some((ts) => timeToMinutesCached(ts.startTime) >= latestMinutes),
      );
      if (hasLateClass) return false;
    }

    return true;
  });
}

export { DAY_MAPPINGS, PATTERNS as NlpPatterns };
