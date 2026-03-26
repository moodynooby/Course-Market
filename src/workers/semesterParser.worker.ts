/**
 * Web Worker for parsing large semester JSON files
 * Runs parsing in background thread to avoid blocking main thread
 */

type ParserMessage =
  | {
      type: 'PARSE_JSON';
      payload: {
        jsonText: string;
        semesterId: string;
      };
    }
  | {
      type: 'FETCH_AND_PARSE';
      payload: {
        url: string;
        semesterId: string;
        semesterName: string;
      };
    };

type ParserResponse =
  | {
      type: 'PARSE_PROGRESS';
      payload: {
        progress: number;
        message: string;
      };
    }
  | {
      type: 'PARSE_SUCCESS';
      payload: {
        semesterId: string;
        semesterName: string;
        version: string;
        courses: import('../types').Course[];
        sections: import('../types').Section[];
        metadata: {
          totalSections: number;
          totalCourses: number;
          subjects: string[];
          creditsRange: {
            min: number;
            max: number;
          };
        };
        parseTime: number;
      };
    }
  | {
      type: 'PARSE_ERROR';
      payload: {
        error: string;
        message: string;
      };
    };

// Transform sections into courses
function transformData(data: any): {
  courses: import('../types').Course[];
  sections: import('../types').Section[];
  metadata: any;
} {
  const coursesMap = new Map<string, import('../types').Course>();
  const sections: import('../types').Section[] = [];

  let minCredits = Infinity;
  let maxCredits = -Infinity;
  const subjectsSet = new Set<string>();

  // Process sections
  data.sections.forEach((section: any) => {
    // Create course entry if not exists
    if (!coursesMap.has(section.courseCode)) {
      const course: import('../types').Course = {
        id: section.courseCode,
        code: section.courseCode,
        name: section.courseName,
        subject: section.subject,
        credits: section.credits,
      };
      coursesMap.set(section.courseCode, course);
    }

    // Create section entry
    const sectionEntry: import('../types').Section = {
      id: section.id,
      courseId: section.courseCode,
      sectionNumber: section.sectionNumber,
      instructor: section.instructor,
      timeSlots: section.timeSlots || [],
      capacity: section.capacity || 0,
      enrolled: section.enrolled || 0,
    };
    sections.push(sectionEntry);

    // Track metadata
    subjectsSet.add(section.subject);
    minCredits = Math.min(minCredits, section.credits);
    maxCredits = Math.max(maxCredits, section.credits);
  });

  const courses = Array.from(coursesMap.values());

  return {
    courses,
    sections,
    metadata: {
      totalSections: sections.length,
      totalCourses: courses.length,
      subjects: Array.from(subjectsSet).sort(),
      creditsRange: {
        min: minCredits === Infinity ? 0 : minCredits,
        max: maxCredits === -Infinity ? 0 : maxCredits,
      },
    },
  };
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<ParserMessage>) => {
  const { type, payload } = event.data;
  const startTime = performance.now();

  try {
    if (type === 'PARSE_JSON') {
      const { jsonText, semesterId } = payload;

      // Send progress update
      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 30,
          message: 'Parsing JSON...',
        },
      } as ParserResponse);

      // Parse JSON (this can be slow for large files)
      const data = JSON.parse(jsonText);

      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 60,
          message: 'Transforming data...',
        },
      } as ParserResponse);

      // Transform data
      const { courses, sections, metadata } = transformData(data);

      const parseTime = performance.now() - startTime;

      self.postMessage({
        type: 'PARSE_SUCCESS',
        payload: {
          semesterId: data.semesterId || semesterId,
          semesterName: data.semesterName || 'Unknown Semester',
          version: data.version || '1.0.0',
          courses,
          sections,
          metadata,
          parseTime,
        },
      } as ParserResponse);
    } else if (type === 'FETCH_AND_PARSE') {
      const { url, semesterId, semesterName } = payload;

      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 10,
          message: 'Fetching data...',
        },
      } as ParserResponse);

      // Fetch JSON
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 40,
          message: 'Downloading JSON...',
        },
      } as ParserResponse);

      const jsonText = await response.text();

      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 60,
          message: 'Parsing JSON...',
        },
      } as ParserResponse);

      // Parse JSON
      const data = JSON.parse(jsonText);

      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 80,
          message: 'Transforming data...',
        },
      } as ParserResponse);

      // Transform data
      const { courses, sections, metadata } = transformData(data);

      const parseTime = performance.now() - startTime;

      self.postMessage({
        type: 'PARSE_SUCCESS',
        payload: {
          semesterId: data.semesterId || semesterId,
          semesterName: data.semesterName || semesterName,
          version: data.version || '1.0.0',
          courses,
          sections,
          metadata,
          parseTime,
        },
      } as ParserResponse);
    }
  } catch (error) {
    console.error('Worker error:', error);

    self.postMessage({
      type: 'PARSE_ERROR',
      payload: {
        error: (error as Error).name,
        message: (error as Error).message,
      },
    } as ParserResponse);
  }
};

export {};
