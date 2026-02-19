import type { Course, Section, CSVParseResult, TimeSlot } from '../types';
import {
  REQUIRED_HEADERS_LOWERCASE,
  HEADER_MAPPING,
  parseDays,
  parseTime,
} from '../constants/csvHeaders';
import { generateId } from './id';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result.map((cell) => cell.replace(/^"|"$/g, '').trim());
}

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

function parseRow(row: string[], headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  headers.forEach((header, index) => {
    const mappedKey = HEADER_MAPPING[header.toLowerCase()];
    if (mappedKey && row[index] !== undefined) {
      result[mappedKey] = row[index];
    }
  });

  return result;
}

export function parseCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    return {
      success: false,
      courses: [],
      sections: [],
      errors: ['CSV file must contain a header row and at least one data row'],
      warnings: [],
    };
  }

  const headers = parseCSVLine(lines[0]);
  const { valid, errors: headerErrors } = validateHeaders(headers);

  if (!valid) {
    return {
      success: false,
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

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCSVLine(line);

    if (row.length !== headers.length) {
      warnings.push(
        `Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${row.length})`,
      );
      continue;
    }

    try {
      const parsed = parseRow(row, headers);

      const courseCode = parsed.courseCode;
      const courseName = parsed.courseName;
      const sectionNumber = parsed.sectionNumber;

      if (!courseCode || !courseName || !sectionNumber) {
        warnings.push(
          `Row ${i + 1}: Missing required fields (Course Code, Course Name, or Section)`,
        );
        continue;
      }

      let course = seenCourses.get(courseCode);
      if (!course) {
        course = {
          id: generateId(),
          code: courseCode,
          name: courseName,
          subject: parsed.subject || courseCode.split(' ')[0],
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
        day: day as 'M' | 'T' | 'W' | 'Th' | 'F' | 'Sa' | 'Su',
        startTime,
        endTime,
      }));

      const section: Section = {
        id: generateId(),
        courseId: course.id,
        sectionNumber: sectionNumber,
        instructor: parsed.instructor || 'TBA',
        location: parsed.location || 'TBA',
        timeSlots,
        capacity: 30,
        enrolled: 0,
        term: parsed.term,
      };

      sections.push(section);
    } catch (err) {
      warnings.push(`Row ${i + 1}: ${(err as Error).message}`);
    }
  }

  return {
    success: courses.length > 0,
    courses,
    sections,
    errors: [],
    warnings,
  };
}
