import type { Course, Section } from '../../src/types';
import type { CourseDataSource, SemesterSummary } from '../types';

const SEMESTERS: SemesterSummary[] = [
  { id: 'Winter2027', name: 'Winter Semester 2027', isActive: true },
  { id: 'Fall2026', name: 'Fall Semester 2026', isActive: false },
];

const COURSES: Course[] = [
  {
    id: 'c-cs101',
    code: 'CS 101',
    name: 'Intro to Computer Science',
    subject: 'CS',
    credits: 3,
    description: 'Foundations of programming and algorithms.',
  },
  {
    id: 'c-math201',
    code: 'MATH 201',
    name: 'Linear Algebra',
    subject: 'MATH',
    credits: 3,
    description: 'Matrices, vector spaces, and eigenvalues.',
  },
  {
    id: 'c-eng105',
    code: 'ENG 105',
    name: 'Technical Writing',
    subject: 'ENG',
    credits: 3,
    description: 'Clear technical communication.',
  },
];

const SECTIONS: Section[] = [
  {
    id: 's-cs101-1',
    courseId: 'c-cs101',
    sectionNumber: '1',
    instructor: 'Dr. Ada Lovelace',
    capacity: 30,
    enrolled: 25,
    timeSlots: [
      { day: 'M', startTime: '09:00', endTime: '10:30' },
      { day: 'W', startTime: '09:00', endTime: '10:30' },
    ],
  },
  {
    id: 's-cs101-2',
    courseId: 'c-cs101',
    sectionNumber: '2',
    instructor: 'Dr. Alan Turing',
    capacity: 30,
    enrolled: 30,
    timeSlots: [
      { day: 'T', startTime: '14:00', endTime: '15:30' },
      { day: 'Th', startTime: '14:00', endTime: '15:30' },
    ],
  },
  {
    id: 's-math201-1',
    courseId: 'c-math201',
    sectionNumber: '1',
    instructor: 'Dr. Emmy Noether',
    capacity: 40,
    enrolled: 20,
    timeSlots: [
      { day: 'M', startTime: '09:30', endTime: '11:00' },
      { day: 'W', startTime: '09:30', endTime: '11:00' },
    ],
  },
  {
    id: 's-math201-2',
    courseId: 'c-math201',
    sectionNumber: '2',
    instructor: 'Dr. Carl Gauss',
    capacity: 40,
    enrolled: 10,
    timeSlots: [
      { day: 'M', startTime: '11:00', endTime: '12:30' },
      { day: 'W', startTime: '11:00', endTime: '12:30' },
    ],
  },
  {
    id: 's-eng105-1',
    courseId: 'c-eng105',
    sectionNumber: '1',
    instructor: 'Prof. Grace Hopper',
    capacity: 0,
    enrolled: 0,
    timeSlots: [{ day: 'F', startTime: '10:00', endTime: '12:00' }],
  },
];

function norm(v: string): string {
  return v.trim().replace(/\s+/g, '').toUpperCase();
}

export function createMockCourseDataSource(): CourseDataSource {
  return {
    async listSemesters() {
      return SEMESTERS;
    },
    async listSubjects(semesterId) {
      if (semesterId !== 'Winter2027') return [];
      const counts = new Map<string, number>();
      for (const c of COURSES) {
        counts.set(c.subject, (counts.get(c.subject) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subject, courseCount]) => ({ subject, courseCount }));
    },
    async searchCourses(filters) {
      if (filters.semesterId !== 'Winter2027') {
        return { courses: [], sections: [], total: 0 };
      }
      let matched = [...COURSES];
      if (filters.subject && filters.subject.toLowerCase() !== 'all') {
        matched = matched.filter((c) => c.subject.toLowerCase() === filters.subject?.toLowerCase());
      }
      if (typeof filters.minCredits === 'number') {
        matched = matched.filter((c) => c.credits >= (filters.minCredits ?? 0));
      }
      if (typeof filters.maxCredits === 'number') {
        matched = matched.filter((c) => c.credits <= (filters.maxCredits ?? Number.MAX_VALUE));
      }
      if (filters.q?.trim()) {
        const term = filters.q.trim().toLowerCase();
        matched = matched.filter((c) => {
          const secMatch = SECTIONS.some(
            (s) => s.courseId === c.id && s.instructor.toLowerCase().includes(term),
          );
          return (
            c.code.toLowerCase().includes(term) ||
            c.name.toLowerCase().includes(term) ||
            (c.description ?? '').toLowerCase().includes(term) ||
            secMatch
          );
        });
      }
      if (filters.openSeatsOnly) {
        matched = matched.filter((c) =>
          SECTIONS.some((s) => s.courseId === c.id && (s.capacity <= 0 || s.enrolled < s.capacity)),
        );
      }
      const total = matched.length;
      const paged = matched.slice(filters.offset, filters.offset + filters.limit);
      const ids = new Set(paged.map((c) => c.id));
      return {
        courses: paged,
        sections: SECTIONS.filter((s) => ids.has(s.courseId)),
        total,
      };
    },
    async getCourseDetails(semesterId, identifier) {
      if (semesterId !== 'Winter2027') return null;
      const course = COURSES.find((c) =>
        identifier.courseId
          ? c.id === identifier.courseId
          : identifier.courseCode
            ? norm(c.code) === norm(identifier.courseCode)
            : false,
      );
      if (!course) return null;
      return {
        course,
        sections: SECTIONS.filter((s) => s.courseId === course.id),
      };
    },
    async getCoursesByIdentifiers(semesterId, identifiers) {
      if (semesterId !== 'Winter2027') {
        return {
          courses: [],
          sections: [],
          missing: [...(identifiers.courseIds ?? []), ...(identifiers.courseCodes ?? [])],
        };
      }
      const matched: Course[] = [];
      const seen = new Set<string>();
      const missing: string[] = [];

      for (const id of identifiers.courseIds ?? []) {
        const course = COURSES.find((c) => c.id === id);
        if (!course) {
          missing.push(id);
        } else if (!seen.has(course.id)) {
          seen.add(course.id);
          matched.push(course);
        }
      }
      for (const code of identifiers.courseCodes ?? []) {
        const course = COURSES.find((c) => norm(c.code) === norm(code));
        if (!course) {
          missing.push(code);
        } else if (!seen.has(course.id)) {
          seen.add(course.id);
          matched.push(course);
        }
      }
      return {
        courses: matched,
        sections: SECTIONS.filter((s) => seen.has(s.courseId)),
        missing,
      };
    },
    async getSectionsByIds(semesterId, sectionIds) {
      if (semesterId !== 'Winter2027') {
        return { courses: [], sections: [], missing: sectionIds };
      }
      const sections = SECTIONS.filter((s) => sectionIds.includes(s.id));
      const foundIds = new Set(sections.map((s) => s.id));
      const courseIds = new Set(sections.map((s) => s.courseId));
      return {
        courses: COURSES.filter((c) => courseIds.has(c.id)),
        sections,
        missing: sectionIds.filter((id) => !foundIds.has(id)),
      };
    },
    async getSectionsByCourseAndNumber(semesterId, pairs) {
      if (semesterId !== 'Winter2027') {
        return {
          courses: [],
          sections: [],
          missing: pairs.map((p) => `${p.courseCode} (${p.sectionNumber})`),
        };
      }
      const matched: Section[] = [];
      const missing: string[] = [];
      for (const pair of pairs) {
        const course = COURSES.find((c) => norm(c.code) === norm(pair.courseCode));
        const section = course
          ? SECTIONS.find(
              (s) =>
                s.courseId === course.id &&
                s.sectionNumber.toUpperCase() === pair.sectionNumber.trim().toUpperCase(),
            )
          : undefined;
        if (section) {
          matched.push(section);
        } else {
          missing.push(`${pair.courseCode} (${pair.sectionNumber})`);
        }
      }
      const courseIds = new Set(matched.map((s) => s.courseId));
      return {
        courses: COURSES.filter((c) => courseIds.has(c.id)),
        sections: matched,
        missing,
      };
    },
  };
}
