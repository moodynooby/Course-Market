import Papa from 'papaparse';
import type { Course, Section, CSVParseResult, TimeSlot, DayOfWeek } from '../types';
import {
  REQUIRED_HEADERS_LOWERCASE,
  HEADER_MAPPING,
  parseDays,
  parseTime,
} from '../config/csvConfig';
import { generateId } from './id';

// --- Course Directory format helpers ---

const DAY_ABBREV: Record<string, DayOfWeek> = {
  Mon: 'M',
  Tue: 'T',
  Wed: 'W',
  Thu: 'Th',
  Fri: 'F',
  Sat: 'Sa',
  Sun: 'Su',
};

interface ParsedScheduleSection {
  sectionNumber: string;
  timeSlots: TimeSlot[];
}

/**
 * Parses the packed "Schedule" column from the Course Directory CSV.
 *
 * Example fragment:
 *   "Section 1  Wed [08:00 to 09:30] [04-08-2025 to 20-11-2025]Fri [08:00 to 09:30] ..."
 */
function parseScheduleColumn(schedule: string): ParsedScheduleSection[] {
  const sections: ParsedScheduleSection[] = [];
  if (!schedule) return sections;

  // Clean up excessive whitespace / tabs
  const cleaned = schedule
    .replace(/\t+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Split on "Section <number>" boundaries
  const sectionChunks = cleaned.split(/(?=Section\s+\d+)/i).filter(Boolean);

  for (const chunk of sectionChunks) {
    // Extract section number: "Section 15  [Bi-Semester]  Tue ..." -> "15"
    const sectionMatch = chunk.match(/^Section\s+(\d+)/i);
    if (!sectionMatch) continue;

    const sectionNumber = sectionMatch[1];

    // Find all day [HH:MM to HH:MM] patterns
    const timePattern =
      /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*\[(\d{1,2}:\d{2})\s*to\s*(\d{1,2}:\d{2})\]/gi;
    const timeSlots: TimeSlot[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = timePattern.exec(chunk)) !== null) {
      const dayAbbrev = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const day = DAY_ABBREV[dayAbbrev];
      const startTime = match[2];
      const endTime = match[3];

      if (day) {
        const key = `${day}-${startTime}-${endTime}`;
        if (!seen.has(key)) {
          seen.add(key);
          timeSlots.push({ day, startTime, endTime });
        }
      }
    }

    if (timeSlots.length > 0) {
      sections.push({ sectionNumber, timeSlots });
    }
  }

  return sections;
}

/**
 * Splits concatenated faculty names like "Gatha JoshipuraJaayini ShahJalaj Singh"
 * into "Gatha Joshipura, Jaayini Shah, Jalaj Singh" by detecting boundaries
 * where a lowercase letter is immediately followed by an uppercase letter.
 */
function splitFacultyNames(raw: string): string {
  if (!raw) return 'TBA';
  const split = raw.replace(/([a-z])([A-Z])/g, '$1, $2').trim();
  return split || 'TBA';
}

/**
 * Extracts a clean course code from strings like "COM101[Undergraduate]" -> "COM101"
 */
function cleanCourseCode(raw: string): string {
  return raw.replace(/\[.*?\]/g, '').trim();
}

/**
 * Extracts subject from course code.
 * Handles formats like "COM101" -> "COM" or "COM 101" -> "COM"
 */
export function extractSubject(courseCode: string): string {
  // First try removing digits (for formats like "COM101")
  const withoutDigits = courseCode.replace(/\d+/g, '').trim();
  if (withoutDigits) {
    return withoutDigits;
  }
  // Fallback to first word (for formats like "COM 101")
  return courseCode.split(' ')[0] || courseCode;
}

/**
 * Detects whether the CSV uses the "Course Directory" format
 * by checking for a "Schedule" column header.
 */
function isCourseDirectoryFormat(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return lower.includes('schedule') && lower.includes('course code');
}

// --- Standard format helpers ---

function validateHeaders(headers: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  const missingHeaders: string[] = [];
  for (const required of REQUIRED_HEADERS_LOWERCASE) {
    if (!normalizedHeaders.includes(required)) {
      missingHeaders.push(required);
    }
  }

  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

function mapRow(row: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    const mappedKey = HEADER_MAPPING[key.toLowerCase().trim()];
    if (mappedKey && value !== undefined) {
      result[mappedKey] = value.trim();
    }
  }

  return result;
}

// --- Main parser ---

export function parseCSV(csvContent: string): CSVParseResult {
  const { data, errors: papaErrors } = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (papaErrors.length > 0 && data.length === 0) {
    return {
      courses: [],
      sections: [],
      errors: papaErrors.map((e) => `Row ${e.row ?? '?'}: ${e.message}`),
      warnings: [],
    };
  }

  if (data.length === 0) {
    return {
      courses: [],
      sections: [],
      errors: ['CSV file must contain a header row and at least one data row'],
      warnings: [],
    };
  }

  const headers = Object.keys(data[0]);

  if (isCourseDirectoryFormat(headers)) {
    return parseCourseDirectoryFormat(data, papaErrors);
  }

  return parseStandardFormat(data, headers, papaErrors);
}

function parseCourseDirectoryFormat(
  data: Record<string, string>[],
  papaErrors: Papa.ParseError[],
): CSVParseResult {
  const courses: Course[] = [];
  const sections: Section[] = [];
  const warnings: string[] = [];

  const papaWarnings = papaErrors.map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`);
  warnings.push(...papaWarnings);

  const seenCourses = new Map<string, Course>();

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const rawCode = row['Course Code'] ?? '';
      const courseCode = cleanCourseCode(rawCode);
      const courseName = (row['Course Name'] ?? '').trim();
      const credits = parseInt(row['Credits'] ?? '3', 10) || 3;
      const faculty = splitFacultyNames(row['Faculty'] ?? '');
      const term = (row['Term'] ?? '').trim();
      const description = (row['Course Description'] ?? '')
        .replace(/\s*View\/Print Outline\s*/g, '')
        .trim();
      const schedule = row['Schedule'] ?? '';
      const prerequisite = (row['Prerequisite Course Code'] ?? '').trim();
      const gerCategory = (row['GER Category'] ?? '').trim();

      if (!courseCode || !courseName) {
        warnings.push(`Row ${i + 2}: Missing Course Code or Course Name`);
        continue;
      }

      let course = seenCourses.get(courseCode);
      if (!course) {
        course = {
          id: generateId(),
          code: courseCode,
          name: courseName,
          subject: extractSubject(courseCode),
          credits,
          description: description || undefined,
        };
        courses.push(course);
        seenCourses.set(courseCode, course);
      }

      const parsedSections = parseScheduleColumn(schedule);

      if (parsedSections.length === 0) {
        warnings.push(`Row ${i + 2}: No sections found in Schedule for ${courseCode}`);
        continue;
      }

      for (const ps of parsedSections) {
        const section: Section = {
          id: generateId(),
          courseId: course.id,
          sectionNumber: ps.sectionNumber,
          instructor: faculty || 'TBA',
          timeSlots: ps.timeSlots,
          capacity: 30,
          enrolled: 0,
        };
        sections.push(section);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      warnings.push(`Row ${i + 2}: ${errorMessage}`);
    }
  }

  return {
    courses,
    sections,
    errors: [],
    warnings,
  };
}

function parseStandardFormat(
  data: Record<string, string>[],
  headers: string[],
  papaErrors: Papa.ParseError[],
): CSVParseResult {
  const { valid, errors: headerErrors } = validateHeaders(headers);

  if (!valid) {
    return {
      courses: [],
      sections: [],
      errors: headerErrors,
      warnings: [],
    };
  }

  const courses: Course[] = [];
  const sections: Section[] = [];
  const warnings: string[] = [];
  const seenCourses = new Map<string, Course>();

  const papaWarnings = papaErrors.map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`);
  warnings.push(...papaWarnings);

  for (let i = 0; i < data.length; i++) {
    try {
      const parsed = mapRow(data[i]);

      const courseCode = parsed.courseCode;
      const courseName = parsed.courseName;
      const sectionNumber = parsed.sectionNumber;

      if (!courseCode || !courseName || !sectionNumber) {
        warnings.push(
          `Row ${i + 2}: Missing required fields (Course Code, Course Name, or Section)`,
        );
        continue;
      }

      let course = seenCourses.get(courseCode);
      if (!course) {
        course = {
          id: generateId(),
          code: courseCode,
          name: courseName,
          subject: parsed.subject || extractSubject(courseCode),
          credits: parseInt(parsed.credits, 10) || 3,
          description: '',
        };
        courses.push(course);
        seenCourses.set(course.code, course);
      }

      const daysArray = parseDays(parsed.days || '');
      const startTime = parseTime(parsed.startTime || '00:00');
      const endTime = parseTime(parsed.endTime || '00:00');

      const timeSlots: TimeSlot[] = daysArray.map((day) => ({
        day: day as DayOfWeek,
        startTime,
        endTime,
      }));

      const section: Section = {
        id: generateId(),
        courseId: course.id,
        sectionNumber: sectionNumber,
        instructor: parsed.instructor || 'TBA',
        timeSlots,
        capacity: 30,
        enrolled: 0,
      };

      sections.push(section);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      warnings.push(`Row ${i + 2}: ${errorMessage}`);
    }
  }

  return {
    courses,
    sections,
    errors: [],
    warnings,
  };
}
