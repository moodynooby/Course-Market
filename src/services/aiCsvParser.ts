import Papa from 'papaparse';
import { queryLLM } from './llm';
import { REQUIRED_CSV_HEADERS, HEADER_MAPPING, parseDays, parseTime } from '../constants/csvHeaders';
import type { Course, Section, TimeSlot, CSVParseResult, CSVParsingRule, HeaderMapping } from '../types';
import { getCSVParsingRules, saveCSVParsingRule } from './csvRulesApi';

function generateId(): string {
  return crypto.randomUUID();
}

export async function guessHeaderMappings(
  csvHeaders: string[],
  userId: string
): Promise<HeaderMapping[]> {
  const learnedRules = await getCSVParsingRules(userId);
  const headerRules = learnedRules.filter((r: any) => r.type === 'header');

  const mappings: HeaderMapping[] = [];
  const unmatchedHeaders: string[] = [];

  for (const header of csvHeaders) {
    const lowerHeader = header.toLowerCase().trim();

    // 1. Check direct mapping
    const directMatch = HEADER_MAPPING[lowerHeader];
    if (directMatch) {
      const targetHeader = REQUIRED_CSV_HEADERS.find(h => HEADER_MAPPING[h.toLowerCase()] === directMatch);
      if (targetHeader) {
        mappings.push({ csvHeader: header, mappedHeader: targetHeader, isConfirmed: true });
        continue;
      }
    }

    // 2. Check learned rules
    const learnedRule = headerRules.find(r => r.originalValue.toLowerCase() === lowerHeader);
    if (learnedRule) {
      mappings.push({ csvHeader: header, mappedHeader: learnedRule.mappedValue, isConfirmed: true });
      continue;
    }

    unmatchedHeaders.push(header);
  }

  // 3. Batch AI Guess for remaining headers
  if (unmatchedHeaders.length > 0) {
    try {
      const prompt = `Match the following CSV headers to the target headers.
Target Headers: ${REQUIRED_CSV_HEADERS.join(', ')}

CSV Headers to match: ${unmatchedHeaders.join(', ')}

Return the matches as a JSON object where keys are CSV headers and values are the matched target header (or "None").
Example: { "Units": "Credits", "Prof": "Instructor" }

Return ONLY the JSON object.`;

      const response = await queryLLM(prompt, "You are a CSV data mapping assistant. Always return valid JSON.");
      const cleanedResponse = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
      const guesses = JSON.parse(cleanedResponse);

      for (const header of unmatchedHeaders) {
        const guess = guesses[header] || 'None';
        mappings.push({
          csvHeader: header,
          mappedHeader: REQUIRED_CSV_HEADERS.includes(guess as any) ? guess : 'None',
          isConfirmed: false
        });
      }
    } catch (error) {
      console.error('AI Batch Header Guess failed:', error);
      for (const header of unmatchedHeaders) {
        mappings.push({ csvHeader: header, mappedHeader: 'None', isConfirmed: false });
      }
    }
  }

  return mappings;
}

export async function parseComplexSchedule(
  scheduleStr: string,
  userId: string
): Promise<TimeSlot[]> {
  const learnedRules = await getCSVParsingRules(userId);
  const scheduleRules = learnedRules.filter((r: any) => r.type === 'schedule');

  const ruleContext = scheduleRules.map((r: any) => `Rule: "${r.originalValue}" means ${r.mappedValue} (Explanation: ${r.explanation})`).join('\n');

  const prompt = `Parse the following course schedule string into a JSON array of TimeSlots.
Each TimeSlot should have: { "day": "M"|"T"|"W"|"Th"|"F"|"Sa"|"Su", "startTime": "HH:mm", "endTime": "HH:mm" }

Schedule string: "${scheduleStr}"

${ruleContext ? `Context from previous corrections:\n${ruleContext}\n` : ''}

Example output: [{"day": "M", "startTime": "09:00", "endTime": "09:50"}, {"day": "W", "startTime": "09:00", "endTime": "09:50"}]

Return ONLY the JSON array.`;

  try {
    const response = await queryLLM(prompt, "You are a schedule parsing assistant. Always return valid JSON.");
    const cleanedResponse = response.substring(response.indexOf('['), response.lastIndexOf(']') + 1);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('AI Schedule Parse failed:', error);
    // Fallback to basic parsing
    try {
      const days = parseDays(scheduleStr);
      // We don't have times easily if it's complex, so maybe return empty or partial
      return days.map(day => ({
        day: day as any,
        startTime: '00:00',
        endTime: '00:00'
      }));
    } catch {
      return [];
    }
  }
}

export async function parseCSVWithAI(
  content: string,
  userId: string,
  headerMappings?: HeaderMapping[],
  feedback?: string
): Promise<CSVParseResult> {
  // If feedback is provided, we might want to "learn" from it first
  if (feedback) {
    const learnPrompt = `The user provided this feedback about parsing a CSV: "${feedback}"
Analyze this and extract any new rules for header mapping or schedule parsing.
The Target Header Names MUST be one of: ${REQUIRED_CSV_HEADERS.join(', ')}

Return the rules in a structured JSON format:
{
  "rules": [
    { "type": "header", "originalValue": "CSV Column Name", "mappedValue": "Target Header Name" },
    { "type": "schedule", "originalValue": "Complex string pattern", "mappedValue": "Standard format", "explanation": "..." }
  ]
}`;
    try {
      const response = await queryLLM(learnPrompt, "You are a learning assistant.");
      const cleanedResponse = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
      const learned = JSON.parse(cleanedResponse);
      for (const rule of learned.rules) {
        await saveCSVParsingRule({
          userId,
          type: rule.type,
          originalValue: rule.originalValue,
          mappedValue: rule.mappedValue,
          explanation: rule.explanation || feedback
        });
      }
    } catch (e) {
      console.error("Failed to learn from feedback", e);
    }
  }

  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const detectedHeaders = results.meta.fields || [];

        // If mappings aren't provided, guess them
        const finalMappings = headerMappings || await guessHeaderMappings(detectedHeaders, userId);

        // Check if we have all required headers mapped
        const mappedTargets = new Map<string, string>(); // Target Header -> CSV Header
        finalMappings.forEach(m => {
          if (m.mappedHeader !== 'None') {
            mappedTargets.set(m.mappedHeader, m.csvHeader);
          }
        });

        const missingHeaders = REQUIRED_CSV_HEADERS.filter(h => !mappedTargets.has(h));

        if (missingHeaders.length > 0 && !headerMappings) {
           // We'll return with success false and the mappings to be confirmed
           resolve({
             success: false,
             courses: [],
             sections: [],
             errors: [`Missing required headers: ${missingHeaders.join(', ')}`],
             warnings: [],
             suggestedMappings: finalMappings
           });
           return;
        }

        const courses: Course[] = [];
        const sections: Section[] = [];
        const warnings: string[] = [];
        const seenCourses = new Map<string, Course>();

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          const getValue = (targetHeader: string) => {
            const csvHeader = mappedTargets.get(targetHeader);
            return csvHeader ? row[csvHeader] : undefined;
          };

          const courseCode = getValue('Course Code');
          const courseName = getValue('Course Name');
          const sectionNumber = getValue('Section');

          if (!courseCode || !courseName || !sectionNumber) {
            warnings.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          let course = seenCourses.get(courseCode);
          if (!course) {
            course = {
              id: generateId(),
              code: courseCode,
              name: courseName,
              subject: getValue('Subject') || courseCode.split(' ')[0],
              credits: parseInt(getValue('Credits'), 10) || 3,
              description: ''
            };
            courses.push(course);
            seenCourses.set(course.code, course);
          }

          // Schedule parsing
          let timeSlots: TimeSlot[] = [];
          const daysStr = getValue('Days') || '';
          const startTimeStr = getValue('Start Time') || '';
          const endTimeStr = getValue('End Time') || '';

          try {
            if (daysStr && startTimeStr && endTimeStr) {
              const daysArray = parseDays(daysStr);
              const start = parseTime(startTimeStr);
              const end = parseTime(endTimeStr);
              timeSlots = daysArray.map(day => ({
                day: day as any,
                startTime: start,
                endTime: end
              }));
            } else {
              // Try parsing a combined schedule if available in some unknown column?
              // For now, if we have missing pieces, we could use AI
              // But let's assume if they mapped it, we try to use it.
              // If it fails, then AI.
              throw new Error("Missing schedule pieces");
            }
          } catch (e) {
            // AI to the rescue!
            // We'll pass the whole row context if possible, or just the relevant columns
            const combinedSchedule = `${daysStr} ${startTimeStr}-${endTimeStr}`.trim();
            if (combinedSchedule) {
              timeSlots = await parseComplexSchedule(combinedSchedule, userId);
            }
          }

          const section: Section = {
            id: generateId(),
            courseId: course.id,
            sectionNumber: sectionNumber,
            instructor: getValue('Instructor') || 'TBA',
            location: getValue('Location') || 'TBA',
            timeSlots,
            capacity: 30,
            enrolled: 0,
            term: (row as any).Term // PapaParse might have kept case if not mapped
          };

          sections.push(section);
        }

        resolve({
          success: courses.length > 0,
          courses,
          sections,
          errors: [],
          warnings,
          appliedMappings: finalMappings
        });
      }
    });
  });
}
