import MiniSearch from 'minisearch';
import type { Course, Professor, Section, TradePost } from '../types';
import type { GeneratedSchedule, SearchResult } from '../utils/schedule-types';

const courseSearchOptions = {
  fields: ['code', 'name', 'subject', 'description', 'instructors', 'sectionNumbers'],
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
 * Optimized professor search options.
 * Fields: 'name' is the only searchable field in the Professor type.
 * Performance: Reducing indexed fields speeds up both indexing and search time.
 */
const professorSearchOptions = {
  fields: ['name'],
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
  id: string | number;
  score: number;
  match: Record<string, string[]>;
  [key: string]: any;
}

let courseIndex: MiniSearch | null = null;
let tradeIndex: MiniSearch | null = null;
let tradeList: TradePost[] = [];
const courseMap = new Map<string, Course>();

/**
 * Cache for schedule search to avoid re-indexing on every keystroke
 */
const scheduleCache = new WeakMap<
  GeneratedSchedule[],
  {
    index: MiniSearch;
    lookup: Map<string, GeneratedSchedule>;
  }
>();

/**
 * Cache for professor search
 */
const professorCache = new WeakMap<
  Professor[],
  {
    index: MiniSearch;
    lookup: Map<string | number, Professor>;
  }
>();

export const buildCourseIndex = (courses: Course[], sections?: Section[]) => {
  courseIndex = new MiniSearch(courseSearchOptions);
  courseMap.clear();

  const sectionInfoMap = new Map<
    string,
    { instructors: Set<string>; sectionNumbers: Set<string> }
  >();
  if (sections) {
    for (const section of sections) {
      let info = sectionInfoMap.get(section.courseId);
      if (!info) {
        info = { instructors: new Set(), sectionNumbers: new Set() };
        sectionInfoMap.set(section.courseId, info);
      }
      info.instructors.add(section.instructor);
      info.sectionNumbers.add(section.sectionNumber);
    }
  }

  for (const course of courses) {
    const info = sectionInfoMap.get(course.id);
    courseMap.set(course.id, course);
    courseIndex.add({
      id: course.id,
      code: course.code,
      name: course.name,
      subject: course.subject,
      description: course.description || '',
      instructors: info ? Array.from(info.instructors).join(' ') : '',
      sectionNumbers: info ? Array.from(info.sectionNumbers).join(' ') : '',
    });
  }
};

export const buildTradeIndex = (trades: TradePost[]) => {
  tradeIndex = new MiniSearch(tradeSearchOptions);
  tradeList = trades;
  tradeIndex.addAll(trades);
};

/**
 * Search trades by query
 */
export const searchTradeIndex = (query: string): TradePost[] => {
  if (!tradeIndex || !query.trim()) return tradeList;

  const results = tradeIndex.search(query) as unknown as MiniSearchResult[];
  const resultIds = new Map(results.map((r) => [r.id, r.score]));

  return tradeList
    .filter((t) => resultIds.has(t.id))
    .sort((a, b) => (resultIds.get(b.id) || 0) - (resultIds.get(a.id) || 0));
};

/**
 * Search courses by query
 */
export const searchCourses = (query: string): string[] => {
  if (!courseIndex || !query.trim()) return [];
  const results = courseIndex.search(query) as unknown as MiniSearchResult[];
  return results.map((r) => r.id as string);
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

  let cached = scheduleCache.get(schedules);

  if (!cached) {
    const scheduleIndex = new MiniSearch(scheduleSearchOptions);
    const lookup = new Map<string, GeneratedSchedule>();

    const documents = schedules.map((s) => {
      lookup.set(s.id, s);
      const instructors = Array.from(new Set(s.sections.map((sec) => sec.instructor))).join(' ');
      const days = Array.from(
        new Set(s.sections.flatMap((sec) => sec.timeSlots.map((ts) => ts.day))),
      ).join(' ');
      const times = s.sections
        .flatMap((sec) =>
          sec.timeSlots.map((ts) => {
            const base = `${ts.startTime} ${ts.endTime}`;
            return ts.startDate && ts.endDate ? `${base} ${ts.startDate} ${ts.endDate}` : base;
          }),
        )
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
    cached = { index: scheduleIndex, lookup };
    scheduleCache.set(schedules, cached);
  }

  const results = cached.index.search(query) as unknown as MiniSearchResult[];

  return results.map((r) => {
    const schedule = cached!.lookup.get(r.id.toString())!;
    return {
      schedule,
      relevanceScore: r.score,
      matchedCriteria: Object.keys(r.match),
      explanation: `Matched ${Object.keys(r.match).join(', ')}`,
    };
  });
};

/**
 * Search professors by name or department using MiniSearch
 */
export const searchProfessors = (professors: Professor[], query: string): Professor[] => {
  if (!query.trim()) return professors;

  let cached = professorCache.get(professors);

  if (!cached) {
    const profIndex = new MiniSearch(professorSearchOptions);
    const lookup = new Map<string | number, Professor>();

    for (const p of professors) {
      lookup.set(p.id, p);
    }

    profIndex.addAll(professors);
    cached = { index: profIndex, lookup };
    professorCache.set(professors, cached);
  }

  const results = cached.index.search(query) as unknown as MiniSearchResult[];
  return results.map((r) => cached!.lookup.get(r.id)!);
};
