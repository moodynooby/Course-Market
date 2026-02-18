// Feedback service for self-learning header mappings and schedule parsing
// Uses localStorage for persistence

import type { HeaderAlias, ScheduleCorrection, FeedbackEntry, CustomScheduleFormat } from '../types';

const FEEDBACK_KEY = 'course_market_feedback';
const HEADER_ALIASES_KEY = 'course_market_header_aliases';
const SCHEDULE_CORRECTIONS_KEY = 'course_market_schedule_corrections';
const CUSTOM_SCHEDULE_FORMATS_KEY = 'course_market_custom_schedule_formats';

// Feedback entries for analytics/monitoring
export function saveFeedbackEntry(entry: FeedbackEntry): void {
  const entries = getFeedbackEntries();
  entries.push({ ...entry, timestamp: new Date().toISOString() });
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(entries));
}

export function getFeedbackEntries(): FeedbackEntry[] {
  const saved = localStorage.getItem(FEEDBACK_KEY);
  return saved ? JSON.parse(saved) : [];
}

// Header aliases with confidence scores
export function saveHeaderAlias(alias: string, canonicalHeader: string, confidence: number = 1): void {
  const aliases = getHeaderAliases();
  const normalizedAlias = alias.toLowerCase().trim();
  
  if (aliases[normalizedAlias]) {
    // Update existing alias with running average confidence
    const existing = aliases[normalizedAlias];
    const newConfidence = (existing.confidence * existing.usageCount + confidence) / (existing.usageCount + 1);
    aliases[normalizedAlias] = {
      canonicalHeader,
      confidence: newConfidence,
      usageCount: existing.usageCount + 1,
      lastUsed: new Date().toISOString()
    };
  } else {
    aliases[normalizedAlias] = {
      canonicalHeader,
      confidence,
      usageCount: 1,
      lastUsed: new Date().toISOString()
    };
  }
  
  localStorage.setItem(HEADER_ALIASES_KEY, JSON.stringify(aliases));
}

export function getHeaderAliases(): Record<string, HeaderAlias> {
  const saved = localStorage.getItem(HEADER_ALIASES_KEY);
  return saved ? JSON.parse(saved) : {};
}

export function getLearnedHeaderMappings(): Record<string, string> {
  const aliases = getHeaderAliases();
  const mappings: Record<string, string> = {};
  
  for (const [alias, data] of Object.entries(aliases)) {
    // Only use aliases with confidence >= 0.5
    if (data.confidence >= 0.5) {
      mappings[alias] = data.canonicalHeader;
    }
  }
  
  return mappings;
}

export function removeHeaderAlias(alias: string): void {
  const aliases = getHeaderAliases();
  delete aliases[alias.toLowerCase().trim()];
  localStorage.setItem(HEADER_ALIASES_KEY, JSON.stringify(aliases));
}

// Schedule corrections
export function saveScheduleCorrection(
  rawSchedule: string, 
  days: string[], 
  startTime: string, 
  endTime: string,
  success: boolean = true
): void {
  const corrections = getScheduleCorrections();
  const normalizedRaw = rawSchedule.toLowerCase().trim();
  
  if (corrections[normalizedRaw]) {
    const existing = corrections[normalizedRaw];
    corrections[normalizedRaw] = {
      days,
      startTime,
      endTime,
      usageCount: existing.usageCount + 1,
      successCount: success ? existing.successCount + 1 : existing.successCount,
      lastUsed: new Date().toISOString()
    };
  } else {
    corrections[normalizedRaw] = {
      days,
      startTime,
      endTime,
      usageCount: 1,
      successCount: success ? 1 : 0,
      lastUsed: new Date().toISOString()
    };
  }
  
  localStorage.setItem(SCHEDULE_CORRECTIONS_KEY, JSON.stringify(corrections));
}

export function getScheduleCorrections(): Record<string, ScheduleCorrection> {
  const saved = localStorage.getItem(SCHEDULE_CORRECTIONS_KEY);
  return saved ? JSON.parse(saved) : {};
}

export function findScheduleCorrection(rawSchedule: string): ScheduleCorrection | null {
  const corrections = getScheduleCorrections();
  const normalizedRaw = rawSchedule.toLowerCase().trim();
  
  // Exact match
  if (corrections[normalizedRaw]) {
    return corrections[normalizedRaw];
  }
  
  // Try fuzzy matching for similar schedules
  const threshold = 0.8;
  for (const [key, correction] of Object.entries(corrections)) {
    const similarity = calculateSimilarity(normalizedRaw, key);
    if (similarity >= threshold && correction.usageCount > 1) {
      return correction;
    }
  }
  
  return null;
}

export function removeScheduleCorrection(rawSchedule: string): void {
  const corrections = getScheduleCorrections();
  delete corrections[rawSchedule.toLowerCase().trim()];
  localStorage.setItem(SCHEDULE_CORRECTIONS_KEY, JSON.stringify(corrections));
}

// Simple string similarity (Jaccard index for word sets)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Get high-confidence corrections for autocomplete/suggestions
export function getSuggestedHeaderMappings(detectedHeaders: string[]): Array<{ detected: string; suggested: string; confidence: number }> {
  const aliases = getHeaderAliases();
  const suggestions: Array<{ detected: string; suggested: string; confidence: number }> = [];
  
  for (const header of detectedHeaders) {
    const normalized = header.toLowerCase().trim();
    
    // Direct match
    if (aliases[normalized] && aliases[normalized].confidence >= 0.7) {
      suggestions.push({
        detected: header,
        suggested: aliases[normalized].canonicalHeader,
        confidence: aliases[normalized].confidence
      });
      continue;
    }
    
    // Partial match
    for (const [alias, data] of Object.entries(aliases)) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        if (data.confidence >= 0.7) {
          suggestions.push({
            detected: header,
            suggested: data.canonicalHeader,
            confidence: data.confidence * 0.8 // Slightly lower confidence for partial match
          });
          break;
        }
      }
    }
  }
  
  return suggestions;
}

// Clear all feedback data
export function clearAllFeedback(): void {
  localStorage.removeItem(FEEDBACK_KEY);
  localStorage.removeItem(HEADER_ALIASES_KEY);
  localStorage.removeItem(SCHEDULE_CORRECTIONS_KEY);
}

// Export feedback statistics for analytics
export function getFeedbackStats(): {
  totalEntries: number;
  headerAliases: number;
  scheduleCorrections: number;
  avgHeaderConfidence: number;
} {
  const entries = getFeedbackEntries();
  const aliases = getHeaderAliases();
  const corrections = getScheduleCorrections();
  
  const aliasValues = Object.values(aliases);
  const avgConfidence = aliasValues.length > 0
    ? aliasValues.reduce((sum, a) => sum + a.confidence, 0) / aliasValues.length
    : 0;
  
  return {
    totalEntries: entries.length,
    headerAliases: aliasValues.length,
    scheduleCorrections: Object.keys(corrections).length,
    avgHeaderConfidence: avgConfidence
  };
}

// Custom schedule format storage
export function saveCustomScheduleFormat(format: CustomScheduleFormat): void {
  const formats = getCustomScheduleFormats();
  formats[format.id] = format;
  localStorage.setItem(CUSTOM_SCHEDULE_FORMATS_KEY, JSON.stringify(formats));
}

export function getCustomScheduleFormats(): Record<string, CustomScheduleFormat> {
  const saved = localStorage.getItem(CUSTOM_SCHEDULE_FORMATS_KEY);
  return saved ? JSON.parse(saved) : {};
}

export function deleteCustomScheduleFormat(formatId: string): void {
  const formats = getCustomScheduleFormats();
  delete formats[formatId];
  localStorage.setItem(CUSTOM_SCHEDULE_FORMATS_KEY, JSON.stringify(formats));
}

// Pattern learning for schedule formats
export function learnSchedulePattern(
  rawSchedule: string,
  separator: string,
  pattern: string,
  description: string
): void {
  const entries = getFeedbackEntries();
  entries.push({
    id: Math.random().toString(36).substring(2, 15),
    type: 'schedule_correction',
    description: `Learned pattern: ${description}`,
    originalValue: rawSchedule,
    correctedValue: `Separator: "${separator}", Pattern: "${pattern}"`,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(entries));
}
