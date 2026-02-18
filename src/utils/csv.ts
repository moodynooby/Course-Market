import Papa from 'papaparse';
import type { Course, Section, CSVParseResult, TimeSlot, CSVPreviewResult, PreviewRow, HeaderMappingSuggestion, MappingConfidence } from '../types';
import { 
  REQUIRED_HEADERS_LOWERCASE,
  TIME_HEADERS_LOWERCASE, 
  HEADER_MAPPING,
  REQUIRED_CSV_HEADERS,
  parseDays, 
  parseTime,
  parseScheduleField,
  hasRequiredTimeInfo,
  findScheduleCorrection,
  saveScheduleCorrection
} from '../constants/csvHeaders';
import { getLearnedHeaderMappings, getHeaderAliases, saveHeaderAlias, saveFeedbackEntry } from '../services/feedback';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

interface ParseContext {
  usedAliases: Record<string, string>;
  usedScheduleCorrections: string[];
}

function buildHeaderMapping(headers: string[]): { 
  mapping: Record<string, string>; 
  unknownHeaders: string[];
  context: ParseContext 
} {
  const mapping: Record<string, string> = {};
  const unknownHeaders: string[] = [];
  const context: ParseContext = { usedAliases: {}, usedScheduleCorrections: [] };
  
  // Combine static and learned mappings
  const learnedMappings = getLearnedHeaderMappings();
  const combinedMapping = { ...HEADER_MAPPING, ...learnedMappings };
  
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    
    if (combinedMapping[normalized]) {
      mapping[header] = combinedMapping[normalized];
      
      // Track if we used a learned mapping
      if (learnedMappings[normalized] && !HEADER_MAPPING[normalized]) {
        context.usedAliases[normalized] = learnedMappings[normalized];
      }
    } else {
      unknownHeaders.push(header);
    }
  }
  
  return { mapping, unknownHeaders, context };
}

function validateHeaders(
  headers: string[], 
  mapping: Record<string, string>
): { valid: boolean; errors: string[]; missingHeaders: string[] } {
  const errors: string[] = [];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const mappedFields = Object.values(mapping);
  
  // Check required headers
  const missingHeaders: string[] = [];
  for (const required of REQUIRED_HEADERS_LOWERCASE) {
    // Check if this required header is directly present or mapped
    const hasDirect = normalizedHeaders.includes(required);
    const hasMapped = mappedFields.some(field => {
      // Reverse lookup: which canonical field corresponds to this required header
      const canonicalForRequired = HEADER_MAPPING[required];
      return field === canonicalForRequired;
    });
    
    if (!hasDirect && !hasMapped) {
      missingHeaders.push(required);
    }
  }
  
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
  
  // Check for time info (either separate columns or combined schedule)
  const hasDays = mappedFields.includes('days');
  const hasStartTime = mappedFields.includes('startTime');
  const hasEndTime = mappedFields.includes('endTime');
  const hasSchedule = mappedFields.includes('schedule');
  
  const hasSeparateTime = hasDays && hasStartTime && hasEndTime;
  const hasCombinedTime = hasSchedule;
  
  if (!hasSeparateTime && !hasCombinedTime) {
    const missingTime: string[] = [];
    if (!hasDays) missingTime.push('Days');
    if (!hasStartTime) missingTime.push('Start Time');
    if (!hasEndTime) missingTime.push('End Time');
    if (missingTime.length > 0) {
      errors.push(`Missing time information. Need either: ${missingTime.join(', ')} columns, OR a combined Schedule column`);
    }
  }
  
  return { valid: errors.length === 0, errors, missingHeaders };
}

function parseRow(row: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [header, value] of Object.entries(row)) {
    const mappedKey = mapping[header];
    if (mappedKey && value !== undefined) {
      result[mappedKey] = value.trim();
    }
  }
  
  return result;
}

function extractTimeSlots(
  parsed: Record<string, string>,
  context: ParseContext
): { timeSlots: TimeSlot[]; warnings: string[]; usedCorrection: boolean } {
  const timeSlots: TimeSlot[] = [];
  const warnings: string[] = [];
  let usedCorrection = false;
  
  // Try separate columns first
  if (parsed.days && parsed.startTime && parsed.endTime) {
    try {
      const daysArray = parseDays(parsed.days);
      const startTime = parseTime(parsed.startTime);
      const endTime = parseTime(parsed.endTime);
      
      for (const day of daysArray) {
        timeSlots.push({
          day: day as TimeSlot['day'],
          startTime,
          endTime
        });
      }
      
      return { timeSlots, warnings, usedCorrection };
    } catch (err) {
      warnings.push(`Failed to parse separate time columns: ${(err as Error).message}`);
    }
  }
  
  // Try combined schedule field
  if (parsed.schedule) {
    // Check learned corrections first
    const correction = findScheduleCorrection(parsed.schedule);
    if (correction) {
      for (const day of correction.days) {
        timeSlots.push({
          day: day as TimeSlot['day'],
          startTime: correction.startTime,
          endTime: correction.endTime
        });
      }
      context.usedScheduleCorrections.push(parsed.schedule);
      usedCorrection = true;
      return { timeSlots, warnings, usedCorrection };
    }
    
    // Parse the schedule field
    const scheduleResult = parseScheduleField(parsed.schedule);
    
    if (scheduleResult.isValid) {
      for (const day of scheduleResult.days) {
        timeSlots.push({
          day: day as TimeSlot['day'],
          startTime: scheduleResult.startTime,
          endTime: scheduleResult.endTime
        });
      }
      
      // Auto-learn this successful parse
      saveScheduleCorrection(
        parsed.schedule,
        scheduleResult.days,
        scheduleResult.startTime,
        scheduleResult.endTime,
        true
      );
      
      return { timeSlots, warnings, usedCorrection };
    } else {
      warnings.push(`Could not parse schedule "${parsed.schedule}": ${scheduleResult.error}`);
    }
  }
  
  return { timeSlots, warnings, usedCorrection };
}

export function parseCSV(csvContent: string, fileName?: string): CSVParseResult {
  const parseContext: ParseContext = { usedAliases: {}, usedScheduleCorrections: [] };
  
  // Parse with PapaParse
  const parseResult = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim()
  });
  
  if (parseResult.errors.length > 0) {
    const criticalErrors = parseResult.errors.filter(e => e.type !== 'Quotes');
    if (criticalErrors.length > 0) {
      return {
        success: false,
        courses: [],
        sections: [],
        errors: criticalErrors.map(e => `Parse error: ${e.message}`),
        warnings: []
      };
    }
  }
  
  if (parseResult.data.length === 0) {
    return {
      success: false,
      courses: [],
      sections: [],
      errors: ['CSV file contains no data rows'],
      warnings: []
    };
  }
  
  const headers = parseResult.meta.fields || [];
  const { mapping, unknownHeaders, context } = buildHeaderMapping(headers);
  
  // Merge contexts
  Object.assign(parseContext.usedAliases, context.usedAliases);
  
  const { valid, errors: headerErrors, missingHeaders } = validateHeaders(headers, mapping);
  
  // If missing headers, return early with detected headers for correction UI
  if (!valid && missingHeaders.length > 0) {
    // Log feedback entry for missing headers
    saveFeedbackEntry({
      id: generateId(),
      type: 'parse_error',
      description: `Missing headers: ${missingHeaders.join(', ')}`,
      originalValue: headers.join(', '),
      fileName
    });
    
    return {
      success: false,
      courses: [],
      sections: [],
      errors: headerErrors,
      warnings: unknownHeaders.length > 0 
        ? [`Unknown headers detected: ${unknownHeaders.join(', ')}`] 
        : [],
      detectedHeaders: headers
    };
  }
  
  const courses: Course[] = [];
  const sections: Section[] = [];
  const warnings: string[] = [];
  const seenCourses = new Map<string, Course>();
  let scheduleParseFailures = 0;
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rowNum = i + 2; // +2 because PapaParse uses 0-indexed data and we skip header
    
    try {
      const parsed = parseRow(row, mapping);
      
      const courseCode = parsed.courseCode;
      const courseName = parsed.courseName;
      const sectionNumber = parsed.sectionNumber;
      
      if (!courseCode || !courseName || !sectionNumber) {
        warnings.push(`Row ${rowNum}: Missing required fields (Course Code, Course Name, or Section)`);
        continue;
      }
      
      // Get or create course
      let course = seenCourses.get(courseCode);
      if (!course) {
        course = {
          id: generateId(),
          code: courseCode,
          name: courseName,
          subject: parsed.subject || courseCode.split(' ')[0],
          credits: parseInt(parsed.credits, 10) || 3,
          description: ''
        };
        courses.push(course);
        seenCourses.set(course.code, course);
      }
      
      // Extract time slots
      const { timeSlots, warnings: timeWarnings, usedCorrection } = extractTimeSlots(parsed, parseContext);
      
      if (timeWarnings.length > 0) {
        warnings.push(`Row ${rowNum}: ${timeWarnings.join(', ')}`);
        scheduleParseFailures++;
      }
      
      if (timeSlots.length === 0) {
        warnings.push(`Row ${rowNum}: No valid time slots extracted`);
        scheduleParseFailures++;
      }
      
      const section: Section = {
        id: generateId(),
        courseId: course.id,
        sectionNumber: sectionNumber,
        instructor: parsed.instructor || 'TBA',
        location: parsed.location || 'TBA',
        timeSlots: timeSlots.length > 0 ? timeSlots : [],
        capacity: 30,
        enrolled: 0,
        term: parsed.term
      };
      
      sections.push(section);
      
    } catch (err) {
      warnings.push(`Row ${rowNum}: ${(err as Error).message}`);
    }
  }
  
  // Log feedback if we had schedule parse failures
  if (scheduleParseFailures > 0) {
    saveFeedbackEntry({
      id: generateId(),
      type: 'parse_error',
      description: `${scheduleParseFailures} schedule parse failures`,
      fileName
    });
  }
  
  return {
    success: courses.length > 0,
    courses,
    sections,
    errors: [],
    warnings,
    detectedHeaders: headers,
    parseContext: {
      usedAliases: parseContext.usedAliases,
      usedScheduleCorrections: parseContext.usedScheduleCorrections
    }
  };
}

// Apply user corrections and re-parse
export function parseCSVWithCorrections(
  csvContent: string, 
  headerCorrections: Record<string, string>,
  scheduleCorrections: Array<{ rowIndex: number; days: string; startTime: string; endTime: string }>,
  fileName?: string
): CSVParseResult {
  // Save header corrections to feedback store
  for (const [detectedHeader, canonicalField] of Object.entries(headerCorrections)) {
    saveHeaderAlias(detectedHeader, canonicalField, 1.0);
  }
  
  // Save schedule corrections to feedback store
  for (const correction of scheduleCorrections) {
    // We need the original schedule text to save the correction
    // This will be handled by the parse process itself via saveScheduleCorrection
    // when it successfully parses the corrected values
  }
  
  // Re-parse with updated mappings
  return parseCSV(csvContent, fileName);
}

// Get detected headers from CSV without full parsing
export function detectCSVHeaders(csvContent: string): string[] {
  const result = Papa.parse(csvContent, {
    header: true,
    preview: 1,
    skipEmptyLines: true
  });
  
  return result.meta.fields || [];
}

// Get suggested mappings for unknown headers
export function getSuggestedHeaderMappings(detectedHeaders: string[]): Array<{ detected: string; suggested: string; confidence: number }> {
  const learnedMappings = getLearnedHeaderMappings();
  const suggestions: Array<{ detected: string; suggested: string; confidence: number }> = [];
  
  for (const header of detectedHeaders) {
    const normalized = header.toLowerCase().trim();
    
    // Check learned mappings
    if (learnedMappings[normalized]) {
      suggestions.push({
        detected: header,
        suggested: learnedMappings[normalized],
        confidence: 0.9
      });
      continue;
    }
    
    // Check static mappings
    if (HEADER_MAPPING[normalized]) {
      suggestions.push({
        detected: header,
        suggested: HEADER_MAPPING[normalized],
        confidence: 1.0
      });
      continue;
    }
    
    // Fuzzy matching for similar headers
    for (const [knownHeader, canonicalField] of Object.entries(HEADER_MAPPING)) {
      const similarity = calculateStringSimilarity(normalized, knownHeader);
      if (similarity >= 0.7) {
        suggestions.push({
          detected: header,
          suggested: canonicalField,
          confidence: similarity
        });
        break;
      }
    }
  }
  
  return suggestions;
}

function calculateStringSimilarity(str1: string, str2: string): number {
  // Simple Levenshtein-based similarity
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

// Get detailed header mapping suggestions with semantic reasons
export function getHeaderMappingSuggestions(detectedHeaders: string[]): HeaderMappingSuggestion[] {
  const learnedAliases = getHeaderAliases();
  const suggestions: HeaderMappingSuggestion[] = [];
  
  const canonicalFields = [
    { field: 'courseCode', labels: ['course code', 'coursecode', 'course id', 'crn', 'catalog', 'class number'], required: true },
    { field: 'courseName', labels: ['course name', 'title', 'course title', 'class title', 'description'], required: true },
    { field: 'subject', labels: ['subject', 'department', 'dept', 'discipline'], required: true },
    { field: 'sectionNumber', labels: ['section', 'sec', 'class section'], required: true },
    { field: 'instructor', labels: ['instructor', 'professor', 'faculty', 'teacher', 'prof'], required: true },
    { field: 'days', labels: ['days', 'day', 'meeting days'], required: false },
    { field: 'startTime', labels: ['start time', 'start', 'begin'], required: false },
    { field: 'endTime', labels: ['end time', 'end', 'finish'], required: false },
    { field: 'schedule', labels: ['schedule', 'meeting time', 'when'], required: false },
    { field: 'location', labels: ['location', 'room', 'building', 'classroom'], required: true },
    { field: 'credits', labels: ['credits', 'hours', 'units', 'credit hours'], required: true },
    { field: 'term', labels: ['term', 'semester', 'quarter', 'session'], required: false },
  ];
  
  for (const header of detectedHeaders) {
    const normalized = header.toLowerCase().trim();
    let bestMatch: HeaderMappingSuggestion | null = null;
    
    // Check learned aliases first (highest confidence)
    if (learnedAliases[normalized]) {
      const learned = learnedAliases[normalized];
      let confidence: MappingConfidence = 'medium';
      if (learned.confidence >= 0.8) confidence = 'high';
      else if (learned.confidence >= 0.5) confidence = 'medium';
      else confidence = 'low';
      
      bestMatch = {
        header,
        suggestedField: learned.canonicalHeader,
        confidence,
        confidenceScore: learned.confidence,
        reason: `Learned from ${learned.usageCount} previous import${learned.usageCount > 1 ? 's' : ''}`,
        alternatives: []
      };
    }
    
    // Check static mappings
    if (!bestMatch && HEADER_MAPPING[normalized]) {
      const canonicalField = HEADER_MAPPING[normalized];
      bestMatch = {
        header,
        suggestedField: canonicalField,
        confidence: 'high',
        confidenceScore: 1.0,
        reason: 'Exact match with known header',
        alternatives: []
      };
    }
    
    // Fuzzy matching for similar headers
    if (!bestMatch) {
      let bestScore = 0;
      let bestField = '';
      const alternatives: string[] = [];
      
      for (const { field, labels } of canonicalFields) {
        for (const label of labels) {
          const similarity = calculateStringSimilarity(normalized, label);
          if (similarity > bestScore) {
            if (bestScore > 0.5) {
              alternatives.push(bestField);
            }
            bestScore = similarity;
            bestField = field;
          } else if (similarity > 0.5 && similarity < bestScore) {
            alternatives.push(field);
          }
        }
      }
      
      if (bestScore >= 0.6) {
        let confidence: MappingConfidence = 'low';
        if (bestScore >= 0.85) confidence = 'high';
        else if (bestScore >= 0.7) confidence = 'medium';
        
        bestMatch = {
          header,
          suggestedField: bestField,
          confidence,
          confidenceScore: bestScore,
          reason: `Similar to "${canonicalFields.find(c => c.field === bestField)?.labels[0] || bestField}"`,
          alternatives: alternatives.slice(0, 2)
        };
      }
    }
    
    // No match found
    if (!bestMatch) {
      bestMatch = {
        header,
        suggestedField: '',
        confidence: 'none',
        confidenceScore: 0,
        reason: 'Unknown header - please map manually',
        alternatives: []
      };
    }
    
    suggestions.push(bestMatch);
  }
  
  return suggestions;
}

// Generate live preview of CSV parsing
export function generateCSVPreview(
  csvContent: string, 
  customMappings: Record<string, string> = {},
  maxRows: number = 5
): CSVPreviewResult {
  // Parse just the preview rows
  const parseResult = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    preview: maxRows,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim()
  });
  
  const headers = parseResult.meta.fields || [];
  const suggestions = getHeaderMappingSuggestions(headers);
  
  // Build final mappings (custom overrides suggestions)
  const mappings: Record<string, string> = {};
  for (const suggestion of suggestions) {
    if (customMappings[suggestion.header] !== undefined) {
      mappings[suggestion.header] = customMappings[suggestion.header];
    } else if (suggestion.confidenceScore >= 0.5) {
      mappings[suggestion.header] = suggestion.suggestedField;
    }
  }
  
  // Check which required fields are present
  const mappedFields = new Set(Object.values(mappings).filter(Boolean));
  const requiredFieldsPresent: Record<string, boolean> = {
    courseCode: mappedFields.has('courseCode'),
    courseName: mappedFields.has('courseName'),
    subject: mappedFields.has('subject'),
    sectionNumber: mappedFields.has('sectionNumber'),
    instructor: mappedFields.has('instructor'),
    location: mappedFields.has('location'),
    credits: mappedFields.has('credits'),
  };
  
  // Check time fields
  const hasSeparateTime = mappedFields.has('days') && mappedFields.has('startTime') && mappedFields.has('endTime');
  const hasCombinedTime = mappedFields.has('schedule');
  requiredFieldsPresent['timeInfo'] = hasSeparateTime || hasCombinedTime;
  
  // Generate preview rows
  const rows: PreviewRow[] = [];
  for (let i = 0; i < parseResult.data.length; i++) {
    const rawRow = parseResult.data[i];
    const rowNum = i + 2; // +2 for header row
    
    const parsedData: PreviewRow['parsedData'] = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Extract mapped values
    for (const [header, value] of Object.entries(rawRow)) {
      const mappedField = mappings[header];
      if (!mappedField || !value) continue;
      
      switch (mappedField) {
        case 'courseCode':
          parsedData.courseCode = value;
          break;
        case 'courseName':
          parsedData.courseName = value;
          break;
        case 'subject':
          parsedData.subject = value;
          break;
        case 'sectionNumber':
          parsedData.sectionNumber = value;
          break;
        case 'instructor':
          parsedData.instructor = value;
          break;
        case 'location':
          parsedData.location = value;
          break;
        case 'credits':
          parsedData.credits = parseInt(value, 10) || undefined;
          break;
        case 'days':
          parsedData.days = parseDays(value);
          if (parsedData.days.length === 0) {
            warnings.push(`Could not parse days: "${value}"`);
          }
          break;
        case 'startTime':
          try {
            parsedData.startTime = parseTime(value);
          } catch (e) {
            errors.push(`Invalid start time: "${value}"`);
          }
          break;
        case 'endTime':
          try {
            parsedData.endTime = parseTime(value);
          } catch (e) {
            errors.push(`Invalid end time: "${value}"`);
          }
          break;
        case 'schedule':
          parsedData.schedule = value;
          const scheduleResult = parseScheduleField(value);
          if (scheduleResult.isValid) {
            parsedData.days = scheduleResult.days;
            parsedData.startTime = scheduleResult.startTime;
            parsedData.endTime = scheduleResult.endTime;
          } else {
            warnings.push(`Schedule: ${scheduleResult.error}`);
          }
          break;
        case 'term':
          parsedData.term = value;
          break;
      }
    }
    
    // Validate required fields
    if (!parsedData.courseCode) errors.push('Missing course code');
    if (!parsedData.courseName) errors.push('Missing course name');
    if (!parsedData.sectionNumber) errors.push('Missing section number');
    
    rows.push({
      rowNumber: rowNum,
      rawData: rawRow,
      parsedData,
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }
  
  // Determine if we can import
  const allRequiredPresent = Object.entries(requiredFieldsPresent)
    .filter(([key]) => key !== 'timeInfo')
    .every(([, present]) => present);
  const canImport = allRequiredPresent && requiredFieldsPresent.timeInfo && rows.length > 0 && rows.some(r => r.isValid);
  
  return {
    headers,
    rows,
    mappings,
    suggestedMappings: suggestions
      .filter(s => s.confidenceScore >= 0.5)
      .map(s => ({ detected: s.header, suggested: s.suggestedField, confidence: s.confidenceScore })),
    unmappedHeaders: suggestions
      .filter(s => s.confidence === 'none' || !mappings[s.header])
      .map(s => s.header),
    requiredFieldsPresent,
    canImport
  };
}

// Export for feedback service
export { getHeaderAliases };

export function generateSampleCSV(): string {
  return `Course Code,Course Name,Subject,Section,Instructor,Days,Start Time,End Time,Location,Credits
CS 101,Intro to Computer Science,CS,001,Dr. Smith,MWF,09:00,09:50,Room 101,3
CS 101,Intro to Computer Science,CS,002,Dr. Jones,MWF,10:00,10:50,Room 102,3
CS 101,Intro to Computer Science,CS,003,Dr. Smith,TTh,14:00,15:15,Room 101,3
MATH 201,Calculus II,MATH,001,Dr. Brown,MWF,08:00,08:50,Room 201,4
MATH 201,Calculus II,MATH,002,Dr. Wilson,TTh,09:30,10:45,Room 202,4
ENG 101,English Composition,ENG,001,Prof. Davis,MWF,11:00,11:50,Room 301,3
ENG 101,English Composition,ENG,002,Prof. Miller,TTh,13:00,14:15,Room 302,3
PHYS 101,Physics I,PHYS,001,Dr. Taylor,MWF,15:00,15:50,Lab 401,4
CHEM 101,Chemistry I,CHEM,001,Prof. Anderson,MWF,12:00,12:50,Lab 501,4`;
}

// Sample CSV with combined schedule column (alternative format)
export function generateSampleCSVWithSchedule(): string {
  return `Course Code,Course Name,Subject,Section,Instructor,Schedule,Location,Credits
CS 101,Intro to Computer Science,CS,001,Dr. Smith,"MWF 9:00 AM - 9:50 AM",Room 101,3
CS 101,Intro to Computer Science,CS,002,Dr. Jones,"MWF 10:00 AM - 10:50 AM",Room 102,3
CS 101,Intro to Computer Science,CS,003,Dr. Smith,"TTh 2:00 PM - 3:15 PM",Room 101,3
MATH 201,Calculus II,MATH,001,Dr. Brown,"MWF 8:00 AM - 8:50 AM",Room 201,4
MATH 201,Calculus II,MATH,002,Dr. Wilson,"TTh 9:30 AM - 10:45 AM",Room 202,4`;
}
