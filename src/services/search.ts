import MiniSearch from 'minisearch';
import type { Course, Section, TradePost } from '../types';
import type { GeneratedSchedule, SearchResult } from '../utils/schedule-types';

const courseSearchOptions = {
  fields: ['code', 'name', 'subject', 'description'],
  storeFields: ['id'],
  searchOptions: {
    prefix: true,
    fuzzy: 0.2,
  },
};

const tradeSearchOptions = {
  fields: [
    'courseCode',
    'courseName',
    'sectionOffered',
    'sectionWanted',
    'description',
    'userDisplayName',
  ],
  storeFields: ['id'],
  searchOptions: {
    prefix: true,
    fuzzy: 0.2,
  },
};

const scheduleSearchOptions = {
  fields: ['courseCodes', 'courseNames', 'instructors', 'days', 'times', 'tags'],
  storeFields: ['id'],
  searchOptions: {
    prefix: true,
    fuzzy: 0.2,
  },
};

/**
 * Search results from MiniSearch
 */
interface MiniSearchResult {
  id: string;
  score: number;
  match: Record<string, string[]>;
  [key: string]: any;
}

let courseIndex: MiniSearch | null = null;
const courseMap = new Map<string, Course>();

/**
 * Build long-lived course index
 * @param courses List of courses to index
 * @param _sections Sections (currently unused for course index)
 */
export const buildCourseIndex = (courses: Course[], _sections: Section[]) => {
  courseIndex = new MiniSearch(courseSearchOptions);
  courseMap.clear();

  for (const course of courses) {
    courseMap.set(course.id, course);
    courseIndex.add({
      id: course.id,
      code: course.code,
      name: course.name,
      subject: course.subject,
      description: course.description || '',
    });
  }
};

/**
 * Search courses by query
 */
export const searchCourses = (query: string): string[] => {
  if (!courseIndex || !query.trim()) return [];
  const results = courseIndex.search(query) as unknown as MiniSearchResult[];
  return results.map((r) => r.id);
};

/**
 * Search trades by query
 */
export const searchTrades = (trades: TradePost[], query: string): TradePost[] => {
  if (!query.trim()) return trades;

  const tradeIndex = new MiniSearch(tradeSearchOptions);
  tradeIndex.addAll(trades);

  const results = tradeIndex.search(query) as unknown as MiniSearchResult[];
  const resultIds = new Set(results.map((r) => r.id));

  return trades
    .filter((t) => resultIds.has(t.id))
    .sort((a, b) => {
      const scoreA = results.find((r) => r.id === a.id)?.score || 0;
      const scoreB = results.find((r) => r.id === b.id)?.score || 0;
      return scoreB - scoreA;
    });
};

/**
 * Search schedules by query
 */
export const searchSchedules = (schedules: GeneratedSchedule[], query: string): SearchResult[] => {
  if (!query.trim()) {
    return schedules.map((s) => ({
      schedule: s,
      relevanceScore: 1,
      matchedCriteria: [],
    }));
  }

  const scheduleIndex = new MiniSearch(scheduleSearchOptions);

  const documents = schedules.map((s) => {
    const instructors = Array.from(new Set(s.sections.map((sec) => sec.instructor))).join(' ');
    const days = Array.from(
      new Set(s.sections.flatMap((sec) => sec.timeSlots.map((ts) => ts.day))),
    ).join(' ');
    const times = s.sections
      .flatMap((sec) => sec.timeSlots.map((ts) => `${ts.startTime} ${ts.endTime}`))
      .join(' ');

    const courseCodes = s.sections
      .map((sec) => {
        const course = courseMap.get(sec.courseId);
        return course ? course.code : sec.courseId;
      })
      .join(' ');

    const courseNames = s.sections
      .map((sec) => {
        const course = courseMap.get(sec.courseId);
        return course ? course.name : '';
      })
      .join(' ');

    const tags: string[] = [];
    const hasMorning = s.sections.some((sec) =>
      sec.timeSlots.some((ts) => {
        const hour = Number.parseInt(ts.startTime.split(':')[0], 10);
        return hour < 12;
      }),
    );
    const hasAfternoon = s.sections.some((sec) =>
      sec.timeSlots.some((ts) => {
        const hour = Number.parseInt(ts.startTime.split(':')[0], 10);
        return hour >= 12 && hour < 17;
      }),
    );
    const hasEvening = s.sections.some((sec) =>
      sec.timeSlots.some((ts) => {
        const hour = Number.parseInt(ts.startTime.split(':')[0], 10);
        return hour >= 17;
      }),
    );

    if (hasMorning) tags.push('morning');
    if (hasAfternoon) tags.push('afternoon');
    if (hasEvening) tags.push('evening');

    const allDays = s.sections.flatMap((sec) => sec.timeSlots.map((ts) => ts.day));
    if (allDays.includes('M') && allDays.includes('W') && allDays.includes('F')) tags.push('MWF');
    if (allDays.includes('T') && allDays.includes('Th')) tags.push('TTh');

    return {
      id: s.id,
      courseCodes,
      courseNames,
      instructors,
      days,
      times,
      tags: tags.join(' '),
    };
  });

  scheduleIndex.addAll(documents);
  const results = scheduleIndex.search(query) as unknown as MiniSearchResult[];

  return results.map((r) => {
    const schedule = schedules.find((s) => s.id === r.id)!;
    return {
      schedule,
      relevanceScore: r.score,
      matchedCriteria: Object.keys(r.match),
      explanation: `Matched ${Object.keys(r.match).join(', ')}`,
    };
  });
};
