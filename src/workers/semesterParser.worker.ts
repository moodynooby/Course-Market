/**
 * Web Worker for parsing large semester JSON files
 * Runs parsing in background thread to avoid blocking main thread
 */

import { transformSections } from '../utils/semester-transform';

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
        courses: import('../types').Course[];
        sections: import('../types').Section[];
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

self.onmessage = async (event: MessageEvent<ParserMessage>) => {
  const { type, payload } = event.data;
  const startTime = performance.now();

  try {
    if (type === 'PARSE_JSON') {
      const { jsonText, semesterId } = payload;

      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 30,
          message: 'Parsing JSON...',
        },
      } as ParserResponse);

      const data = JSON.parse(jsonText);

      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 60,
          message: 'Transforming data...',
        },
      } as ParserResponse);

      const { courses, sections } = transformSections(data.sections);

      const parseTime = performance.now() - startTime;

      self.postMessage({
        type: 'PARSE_SUCCESS',
        payload: {
          semesterId: data.semesterId || semesterId,
          semesterName: data.semesterName || 'Unknown Semester',
          courses,
          sections,
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

      const data = JSON.parse(jsonText);

      self.postMessage({
        type: 'PARSE_PROGRESS',
        payload: {
          progress: 80,
          message: 'Transforming data...',
        },
      } as ParserResponse);

      const { courses, sections } = transformSections(data.sections);

      const parseTime = performance.now() - startTime;

      self.postMessage({
        type: 'PARSE_SUCCESS',
        payload: {
          semesterId: data.semesterId || semesterId,
          semesterName: data.semesterName || semesterName,
          courses,
          sections,
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
