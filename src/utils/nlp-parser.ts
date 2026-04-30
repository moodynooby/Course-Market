import * as chrono from 'chrono-node';
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
 * Check if a schedule matches the given intent
 */
export function scheduleMatchesIntent(
  schedule: GeneratedSchedule,
  intent: ScheduleIntent,
): { matches: boolean; score: number; criteria: string[] } {
  const criteria: string[] = [];
  const penalties: number[] = [];

  const avoidDaysSet = intent.avoidDays ? new Set(intent.avoidDays) : null;
  const specificDaysSet = intent.specificDays ? new Set(intent.specificDays) : null;
  const earliestMinutes = intent.earliestTime ? timeToMinutesCached(intent.earliestTime) : null;
  const latestMinutes = intent.latestTime ? timeToMinutesCached(intent.latestTime) : null;

  let hasMorningClasses = false;
  let hasAfternoonClasses = false;
  let hasAvoidedDays = false;
  let hasEarlyClass = false;
  let hasLateClass = false;
  const scheduleDays = new Set<DayOfWeek>();

  // Single pass over sections and time slots
  for (const section of schedule.sections) {
    for (const slot of section.timeSlots) {
      const startMinutes = timeToMinutesCached(slot.startTime);
      const hour = Math.floor(startMinutes / 60);

      scheduleDays.add(slot.day);

      if (hour >= 6 && hour < 12) hasMorningClasses = true;
      if (hour >= 12 && hour < 17) hasAfternoonClasses = true;

      if (avoidDaysSet?.has(slot.day)) hasAvoidedDays = true;

      if (earliestMinutes !== null && startMinutes < earliestMinutes) {
        hasEarlyClass = true;
      }

      if (latestMinutes !== null && startMinutes >= latestMinutes) {
        hasLateClass = true;
      }
    }
  }

  if (intent.preferMorning) {
    if (hasMorningClasses) criteria.push('Has morning classes');
    else penalties.push(0.3);
  }

  if (intent.preferAfternoon) {
    if (hasAfternoonClasses) criteria.push('Has afternoon classes');
    else penalties.push(0.3);
  }

  if (avoidDaysSet) {
    if (!hasAvoidedDays) criteria.push(`Avoids ${intent.avoidDays?.join(', ')} classes`);
    else penalties.push(0.5);
  }

  if (specificDaysSet) {
    const hasAllDays = intent.specificDays?.every((day) => scheduleDays.has(day));
    if (hasAllDays) criteria.push(`Includes ${intent.specificDays?.join(', ')} classes`);
    else penalties.push(0.4);
  }

  if (earliestMinutes !== null) {
    if (!hasEarlyClass) criteria.push(`No classes before ${intent.earliestTime}`);
    else penalties.push(0.4);
  }

  if (latestMinutes !== null) {
    if (!hasLateClass) criteria.push(`No classes after ${intent.latestTime}`);
    else penalties.push(0.4);
  }

  const totalPenalty = penalties.reduce((sum, p) => sum + p, 0);
  const score = Math.max(0, 1 - totalPenalty);

  return {
    matches: score > 0.5,
    score,
    criteria,
  };
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
  const results: SearchResult[] = [];

  for (const schedule of schedules) {
    const { matches, score, criteria } = scheduleMatchesIntent(schedule, intent);

    if (matches || score > 0.3) {
      results.push({
        schedule,
        relevanceScore: Math.round(score * 100) / 100,
        matchedCriteria: criteria,
        explanation: generateExplanation(schedule, intent, score),
      });
    }
  }

  // Sort by relevance score descending
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Generate human-readable explanation for match
 */
function generateExplanation(
  schedule: GeneratedSchedule,
  intent: ScheduleIntent,
  score: number,
): string {
  const parts: string[] = [];

  if (score >= 0.9) {
    parts.push('Excellent match for your criteria');
  } else if (score >= 0.7) {
    parts.push('Good match with minor compromises');
  } else if (score >= 0.5) {
    parts.push('Partial match with some tradeoffs');
  } else {
    parts.push('Limited match - review carefully');
  }

  if (
    intent.preferMorning &&
    schedule.sections.some((s) => s.timeSlots.some((t) => parseInt(t.startTime) < 720))
  ) {
    parts.push('includes morning classes');
  }

  if (intent.avoidDays && intent.avoidDays.length > 0) {
    const hasAvoidedDays = schedule.sections.some((s) =>
      s.timeSlots.some((t) => intent.avoidDays?.includes(t.day)),
    );
    if (!hasAvoidedDays) {
      parts.push(`avoids ${intent.avoidDays.join('/')} classes`);
    }
  }

  return parts.join(', ') + '.';
}

export { PATTERNS as NlpPatterns, DAY_MAPPINGS };
