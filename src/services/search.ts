import MiniSearch from 'minisearch';
import type { Course, Professor, Schedule, Section, TradePost } from '../types';
import { getTimeBand, timeToMinutes } from '../utils/schedule-time';

export interface SearchResult {
  schedule: Schedule;
  relevanceScore: number;
  matchedCriteria: string[];
  explanation?: string;
}

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

const courseIndexCache = new WeakMap<
  Course[],
  WeakMap<Section[], { index: MiniSearch; lookup: Map<string, Course> }>
>();

const tradeIndexCache = new WeakMap<TradePost[], { index: MiniSearch; list: TradePost[] }>();

const scheduleCache = new WeakMap<
  Schedule[],
  WeakMap<Course[], { index: MiniSearch; lookup: Map<string, Schedule> }>
>();

const professorCache = new WeakMap<
  Professor[],
  {
    index: MiniSearch;
    lookup: Map<string | number, Professor>;
  }
>();

function getCourseIndex(courses: Course[], sections: Section[]) {
  let bySections = courseIndexCache.get(courses);
  if (!bySections) {
    bySections = new WeakMap();
    courseIndexCache.set(courses, bySections);
  }
  let cached = bySections.get(sections);
  if (!cached) {
    const index = new MiniSearch(courseSearchOptions);
    const lookup = new Map<string, Course>();
    const sectionInfoMap = new Map<
      string,
      { instructors: Set<string>; sectionNumbers: Set<string> }
    >();

    for (const section of sections) {
      let info = sectionInfoMap.get(section.courseId);
      if (!info) {
        info = { instructors: new Set(), sectionNumbers: new Set() };
        sectionInfoMap.set(section.courseId, info);
      }
      info.instructors.add(section.instructor);
      info.sectionNumbers.add(section.sectionNumber);
    }

    for (const course of courses) {
      const info = sectionInfoMap.get(course.id);
      lookup.set(course.id, course);
      index.add({
        id: course.id,
        code: course.code,
        name: course.name,
        subject: course.subject,
        description: course.description || '',
        instructors: info ? Array.from(info.instructors).join(' ') : '',
        sectionNumbers: info ? Array.from(info.sectionNumbers).join(' ') : '',
      });
    }
    cached = { index, lookup };
    bySections.set(sections, cached);
  }
  return cached;
}

export const searchTradeIndex = (trades: TradePost[], query: string): TradePost[] => {
  if (!query.trim()) return trades;

  let cached = tradeIndexCache.get(trades);
  if (!cached) {
    const index = new MiniSearch(tradeSearchOptions);
    index.addAll(trades);
    cached = { index, list: trades };
    tradeIndexCache.set(trades, cached);
  }

  const results = cached.index.search(query);
  const resultIds = new Map(results.map((r) => [r.id, r.score]));

  return cached.list
    .filter((t) => resultIds.has(t.id))
    .sort((a, b) => (resultIds.get(b.id) || 0) - (resultIds.get(a.id) || 0));
};

export const searchCourses = (courses: Course[], sections: Section[], query: string): Course[] => {
  if (!query.trim()) return [];
  const { index, lookup } = getCourseIndex(courses, sections);
  return index
    .search(query)
    .map((r) => lookup.get(String(r.id)))
    .filter((c): c is Course => !!c);
};

export const searchSchedules = (
  schedules: Schedule[],
  courses: Course[],
  query: string,
): SearchResult[] => {
  if (!query.trim()) {
    return schedules.map((s) => ({
      schedule: s,
      relevanceScore: 1,
      matchedCriteria: [],
    }));
  }

  const courseById = new Map(courses.map((c) => [c.id, c]));
  let byCourses = scheduleCache.get(schedules);
  if (!byCourses) {
    byCourses = new WeakMap();
    scheduleCache.set(schedules, byCourses);
  }
  let cached = byCourses.get(courses);

  if (!cached) {
    const scheduleIndex = new MiniSearch(scheduleSearchOptions);
    const lookup = new Map<string, Schedule>();

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
          const course = courseById.get(sec.courseId);
          return course ? course.code : sec.courseId;
        })
        .join(' ');

      const courseNames = s.sections
        .map((sec) => {
          const course = courseById.get(sec.courseId);
          return course ? course.name : '';
        })
        .join(' ');

      const tags: string[] = [];
      const bands = new Set(
        s.sections.flatMap((sec) =>
          sec.timeSlots.map((ts) => getTimeBand(timeToMinutes(ts.startTime))),
        ),
      );
      if (bands.has('morning')) tags.push('morning');
      if (bands.has('afternoon')) tags.push('afternoon');
      if (bands.has('evening')) tags.push('evening');

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
    byCourses.set(courses, cached);
  }

  const activeCache = cached;
  const results = activeCache.index.search(query);

  return results.flatMap((r) => {
    const schedule = activeCache.lookup.get(r.id.toString());
    if (!schedule) return [];
    return [
      {
        schedule,
        relevanceScore: r.score,
        matchedCriteria: Object.keys(r.match),
        explanation: `Matched ${Object.keys(r.match).join(', ')}`,
      },
    ];
  });
};

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

  const results = cached.index.search(query);
  return results.flatMap((r) => {
    const professor = cached.lookup.get(r.id);
    return professor ? [professor] : [];
  });
};
