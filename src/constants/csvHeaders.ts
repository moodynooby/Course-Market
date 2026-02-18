import { findScheduleCorrection, saveScheduleCorrection } from '../services/feedback';

// Required headers - these must be present (directly or via mapping)
export const REQUIRED_CSV_HEADERS = [
  'Course Code',
  'Course Name', 
  'Subject',
  'Section',
  'Instructor',
  'Location',
  'Credits'
] as const;

// Time-related headers - either individual columns OR a combined Schedule column
export const TIME_CSV_HEADERS = [
  'Days',
  'Start Time',
  'End Time'
] as const;

// Optional combined schedule column that can replace Days/Start Time/End Time
export const OPTIONAL_CSV_HEADERS = [
  'Schedule',
  'Term',
  'Description'
] as const;

// All expected headers
export const ALL_CSV_HEADERS = [
  ...REQUIRED_CSV_HEADERS,
  ...TIME_CSV_HEADERS,
  ...OPTIONAL_CSV_HEADERS
] as const;

export const REQUIRED_HEADERS_LOWERCASE = REQUIRED_CSV_HEADERS.map(h => h.toLowerCase());
export const TIME_HEADERS_LOWERCASE = TIME_CSV_HEADERS.map(h => h.toLowerCase());

// Canonical field names for internal use
export type CanonicalField = 
  | 'courseCode' 
  | 'courseName' 
  | 'subject' 
  | 'sectionNumber' 
  | 'instructor' 
  | 'days' 
  | 'startTime' 
  | 'endTime' 
  | 'location' 
  | 'credits'
  | 'schedule'
  | 'term';

// Static header mapping with expanded aliases
export const HEADER_MAPPING: Record<string, CanonicalField> = {
  // Course Code variations
  'course code': 'courseCode',
  'coursecode': 'courseCode',
  'course id': 'courseCode',
  'courseid': 'courseCode',
  'class code': 'courseCode',
  'classcode': 'courseCode',
  'catalog number': 'courseCode',
  'catalog nbr': 'courseCode',
  'class nbr': 'courseCode',
  'crn': 'courseCode',
  
  // Course Name variations
  'course name': 'courseName',
  'coursename': 'courseName',
  'course title': 'courseName',
  'coursetitle': 'courseName',
  'class title': 'courseName',
  'title': 'courseName',
  'description': 'courseName',
  
  // Subject variations
  'subject': 'subject',
  'dept': 'subject',
  'department': 'subject',
  'discipline': 'subject',
  'subject code': 'subject',
  
  // Section variations
  'section': 'sectionNumber',
  'section number': 'sectionNumber',
  'sectionnum': 'sectionNumber',
  'sec': 'sectionNumber',
  'class section': 'sectionNumber',
  
  // Instructor variations
  'instructor': 'instructor',
  'professor': 'instructor',
  'faculty': 'instructor',
  'teacher': 'instructor',
  'instructor name': 'instructor',
  'prof': 'instructor',
  'lecturer': 'instructor',
  
  // Days variations
  'days': 'days',
  'day': 'days',
  'meeting days': 'days',
  'meetingdays': 'days',
  'class days': 'days',
  
  // Start Time variations
  'start time': 'startTime',
  'starttime': 'startTime',
  'start': 'startTime',
  'begin time': 'startTime',
  'begintime': 'startTime',
  'meeting start': 'startTime',
  'class start': 'startTime',
  'start_time': 'startTime',
  
  // End Time variations
  'end time': 'endTime',
  'endtime': 'endTime',
  'end': 'endTime',
  'finish time': 'endTime',
  'finishtime': 'endTime',
  'meeting end': 'endTime',
  'class end': 'endTime',
  'end_time': 'endTime',
  
  // Location variations
  'location': 'location',
  'room': 'location',
  'classroom': 'location',
  'building': 'location',
  'place': 'location',
  'room number': 'location',
  
  // Credits variations
  'credits': 'credits',
  'credit': 'credits',
  'credit hours': 'credits',
  'credithours': 'credits',
  'hours': 'credits',
  'units': 'credits',
  'credit hrs': 'credits',
  
  // Schedule (combined) variations
  'schedule': 'schedule',
  'meeting time': 'schedule',
  'meetingtime': 'schedule',
  'meeting info': 'schedule',
  'class time': 'schedule',
  'classtime': 'schedule',
  'when': 'schedule',
  
  // Term variations
  'term': 'term',
  'semester': 'term',
  'quarter': 'term',
  'academic term': 'term',
  'session': 'term'
};

// Day parsing with expanded aliases
export function parseDays(daysString: string): string[] {
  if (!daysString || daysString.trim() === '') {
    return [];
  }
  
  const dayMap: Record<string, string> = {
    // Standard
    'monday': 'M', 'mon': 'M', 'm': 'M',
    'tuesday': 'T', 'tue': 'T', 'tues': 'T', 't': 'T',
    'wednesday': 'W', 'wed': 'W', 'w': 'W',
    'thursday': 'Th', 'thu': 'Th', 'thur': 'Th', 'thurs': 'Th', 'th': 'Th', 'r': 'Th',
    'friday': 'F', 'fri': 'F', 'f': 'F',
    'saturday': 'Sa', 'sat': 'Sa', 'sa': 'Sa',
    'sunday': 'Su', 'sun': 'Su', 'su': 'Su'
  };

  // Handle various separators and formats
  const normalized = daysString.toLowerCase()
    .replace(/\//g, ' ')  // Convert slashes to spaces
    .replace(/,/g, ' ')   // Convert commas to spaces
    .replace(/-/g, ' ')   // Convert dashes to spaces
    .replace(/&/g, ' ');  // Convert ampersands to spaces
  
  const tokens = normalized.split(/\s+/).filter(Boolean);
  
  // Check if we have compact format like "MWF" or "TTh"
  const compactPattern = normalized.replace(/\s/g, '');
  if (/^[mtwhfusa]+$/.test(compactPattern)) {
    const result: string[] = [];
    let i = 0;
    while (i < compactPattern.length) {
      // Check for "Th" (Thursday) before single letters
      if (i < compactPattern.length - 1 && compactPattern.substring(i, i + 2) === 'th') {
        result.push('Th');
        i += 2;
      } else if (i < compactPattern.length - 1 && compactPattern.substring(i, i + 2) === 'sa') {
        result.push('Sa');
        i += 2;
      } else if (i < compactPattern.length - 1 && compactPattern.substring(i, i + 2) === 'su') {
        result.push('Su');
        i += 2;
      } else {
        const day = dayMap[compactPattern[i]];
        if (day) {
          result.push(day);
        }
        i++;
      }
    }
    return result;
  }
  
  // Token-based parsing
  return tokens
    .map(token => dayMap[token])
    .filter((day): day is string => day !== undefined);
}

// Time parsing with expanded formats
export function parseTime(timeString: string): string {
  if (!timeString || timeString.trim() === '') {
    return '00:00';
  }
  
  const cleanTime = timeString.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // Try various time formats
  const patterns = [
    // HH:MM AM/PM
    { regex: /^(\d{1,2}):(\d{2})\s*(am|pm)$/, hasPeriod: true },
    // H:MM AM/PM
    { regex: /^(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)$/, hasPeriod: true },
    // HH:MM (24-hour)
    { regex: /^(\d{1,2}):(\d{2})$/, hasPeriod: false },
    // HHMM (24-hour, no colon)
    { regex: /^(\d{2})(\d{2})$/, hasPeriod: false },
    // H MM AM/PM (space instead of colon)
    { regex: /^(\d{1,2})\s+(\d{2})\s*(am|pm)$/, hasPeriod: true },
    // HH.MM (dot separator)
    { regex: /^(\d{1,2})\.(\d{2})$/, hasPeriod: false },
  ];
  
  for (const pattern of patterns) {
    const match = cleanTime.match(pattern.regex);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      
      if (pattern.hasPeriod && match[3]) {
        const period = match[3].replace(/\./g, ''); // Remove dots from a.m./p.m.
        if ((period === 'pm' || period === 'p') && hour !== 12) {
          hour += 12;
        } else if ((period === 'am' || period === 'a') && hour === 12) {
          hour = 0;
        }
      }
      
      // Validate
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }
  }
  
  throw new Error(`Invalid time format: ${timeString}`);
}

// Combined schedule parsing (e.g., "MWF 9:00-9:50", "TTh 14:00-15:15")
export interface ParsedSchedule {
  days: string[];
  startTime: string;
  endTime: string;
  isValid: boolean;
  error?: string;
}

// Complex schedule with multiple time slots, dates, locations
export interface ComplexScheduleTimeSlot {
  section?: string;
  day: string;
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export interface ComplexScheduleResult {
  timeSlots: ComplexScheduleTimeSlot[];
  isValid: boolean;
  error?: string;
}

export function parseScheduleField(scheduleString: string): ParsedSchedule {
  if (!scheduleString || scheduleString.trim() === '') {
    return { days: [], startTime: '', endTime: '', isValid: false, error: 'Empty schedule' };
  }
  
  // Check learned corrections first
  const correction = findScheduleCorrection(scheduleString);
  if (correction && correction.usageCount > 1) {
    return {
      days: correction.days,
      startTime: correction.startTime,
      endTime: correction.endTime,
      isValid: true
    };
  }
  
  const normalized = scheduleString.trim();
  
  // Common patterns:
  // "MWF 9:00-9:50"
  // "TTh 14:00-15:15" 
  // "Mon/Wed 10:00 AM - 11:15 AM"
  // "Monday 9:00am to 10:00am"
  // "M-F 8:00-9:00"
  
  // Try to extract days and time parts
  const patterns = [
    // Pattern: Days followed by time range (dash or "to")
    {
      regex: /^([\w\/\s,]+?)\s+((?:\d{1,2}[:\.]?\d{0,2})\s*(?:am|pm|a\.m\.|p\.m\.)?)\s*(?:-|to|–|—)\s*((?:\d{1,2}[:\.]?\d{0,2})\s*(?:am|pm|a\.m\.|p\.m\.)?)$/i,
      extractDays: (m: RegExpMatchArray) => m[1],
      extractStart: (m: RegExpMatchArray) => m[2],
      extractEnd: (m: RegExpMatchArray) => m[3]
    },
    // Pattern: Time range first, then days
    {
      regex: /^((?:\d{1,2}[:\.]?\d{0,2})\s*(?:am|pm|a\.m\.|p\.m\.)?)\s*(?:-|to|–|—)\s*((?:\d{1,2}[:\.]?\d{0,2})\s*(?:am|pm|a\.m\.|p\.m\.)?)\s+([\w\/\s,]+)$/i,
      extractDays: (m: RegExpMatchArray) => m[3],
      extractStart: (m: RegExpMatchArray) => m[1],
      extractEnd: (m: RegExpMatchArray) => m[2]
    },
    // Pattern: Just time range in brackets or parens
    {
      regex: /\(?([\w\/\s,]+)\)?\s+((?:\d{1,2}[:\.]?\d{2})\s*(?:am|pm)?)\s*-\s*((?:\d{1,2}[:\.]?\d{2})\s*(?:am|pm)?)/i,
      extractDays: (m: RegExpMatchArray) => m[1],
      extractStart: (m: RegExpMatchArray) => m[2],
      extractEnd: (m: RegExpMatchArray) => m[3]
    }
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern.regex);
    if (match) {
      try {
        const daysPart = pattern.extractDays(match).trim();
        const startPart = pattern.extractStart(match).trim();
        const endPart = pattern.extractEnd(match).trim();
        
        const days = parseDays(daysPart);
        
        // Handle AM/PM carryover
        const startTime = parseTime(startPart);
        let endTimeStr = endPart;
        
        // If end time doesn't have AM/PM but start does, infer it
        if (/am|pm/i.test(startPart) && !/am|pm/i.test(endPart)) {
          const startPeriod = startPart.match(/(am|pm)/i)?.[1] || '';
          // Check if end time seems to be in a different period
          const startHour = parseInt(startTime.split(':')[0], 10);
          const endHour = parseInt(endPart.split(':')[0], 10);
          
          if (endHour < startHour || (endHour === startHour && startPeriod === 'pm')) {
            endTimeStr = `${endPart} ${startPeriod === 'am' ? 'pm' : 'am'}`;
          } else {
            endTimeStr = `${endPart} ${startPeriod}`;
          }
        }
        
        const endTime = parseTime(endTimeStr);
        
        if (days.length === 0) {
          return { days: [], startTime: '', endTime: '', isValid: false, error: 'No valid days found' };
        }
        
        return { days, startTime, endTime, isValid: true };
      } catch (err) {
        return { 
          days: [], 
          startTime: '', 
          endTime: '', 
          isValid: false, 
          error: `Parse error: ${(err as Error).message}` 
        };
      }
    }
  }
  
  // Try just extracting days (for schedules without times)
  const daysOnly = parseDays(normalized);
  if (daysOnly.length > 0) {
    return { 
      days: daysOnly, 
      startTime: '', 
      endTime: '', 
      isValid: false, 
      error: 'Days found but no time range' 
    };
  }
  
  return { days: [], startTime: '', endTime: '', isValid: false, error: 'Could not parse schedule format' };
}

// Parse complex schedule formats - now primarily handled by AI fallback
// Kept for backward compatibility and basic regex matches
export function parseComplexSchedule(
  scheduleString: string
): ComplexScheduleResult {
  if (!scheduleString || scheduleString.trim() === '') {
    return { timeSlots: [], isValid: false, error: 'Empty schedule' };
  }

  const timeSlots: ComplexScheduleTimeSlot[] = [];

  // Try alternative format: "Tue 15:00-16:00 (04-08-2025 to 23-11-2025)"
  const altPattern = /(\w+)[\s\[]+(\d{1,2}:\d{2})\s*[-–to]+\s*(\d{1,2}:\d{2})\]?(?:\s*[\[(](\d{2}[/-]\d{2}[/-]\d{4})\s*[-to]+\s*(\d{2}[/-]\d{2}[/-]\d{4})[\])])?/gi;
  let match;
  while ((match = altPattern.exec(scheduleString)) !== null) {
    try {
      const day = parseDayFromString(match[1]);
      const startTime = parseTime(match[2]);
      const endTime = parseTime(match[3]);
      const startDate = match[4];
      const endDate = match[5];

      if (day) {
        timeSlots.push({
          day,
          startTime,
          endTime,
          ...(startDate && { startDate }),
          ...(endDate && { endDate })
        });
      }
    } catch (err) {
      // Ignore failures, AI will handle
    }
  }

  return { timeSlots, isValid: timeSlots.length > 0 };
}

// Helper to parse single day from various formats
function parseDayFromString(dayStr: string): string | null {
  const dayMap: Record<string, string> = {
    'monday': 'M', 'mon': 'M', 'm': 'M',
    'tuesday': 'T', 'tue': 'T', 'tues': 'T', 't': 'T',
    'wednesday': 'W', 'wed': 'W', 'w': 'W',
    'thursday': 'Th', 'thu': 'Th', 'thur': 'Th', 'thurs': 'Th', 'th': 'Th', 'r': 'Th',
    'friday': 'F', 'fri': 'F', 'f': 'F',
    'saturday': 'Sa', 'sat': 'Sa', 'sa': 'Sa',
    'sunday': 'Su', 'sun': 'Su', 'su': 'Su'
  };

  const normalized = dayStr.toLowerCase().trim();
  return dayMap[normalized] || null;
}


// Check if we have required time info (either separate columns or combined)
export function hasRequiredTimeInfo(
  headers: string[], 
  mappedRow: Record<string, string>
): { hasTime: boolean; source: 'separate' | 'combined' | 'none' } {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Check for separate columns
  const hasDays = normalizedHeaders.includes('days') && mappedRow.days;
  const hasStartTime = normalizedHeaders.includes('start time') && mappedRow.startTime;
  const hasEndTime = normalizedHeaders.includes('end time') && mappedRow.endTime;
  
  if (hasDays && hasStartTime && hasEndTime) {
    return { hasTime: true, source: 'separate' };
  }
  
  // Check for combined schedule column
  const hasScheduleCol = normalizedHeaders.some(h => 
    ['schedule', 'meeting time', 'meetingtime', 'classtime'].includes(h)
  );
  const scheduleValue = mappedRow.schedule || '';
  
  if (hasScheduleCol && scheduleValue) {
    const parsed = parseScheduleField(scheduleValue);
    if (parsed.isValid) {
      return { hasTime: true, source: 'combined' };
    }
  }
  
  return { hasTime: false, source: 'none' };
}

// Re-export for convenience
export { findScheduleCorrection, saveScheduleCorrection };
