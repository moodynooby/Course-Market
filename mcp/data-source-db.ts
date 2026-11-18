import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { semesterCourses, semesterSections, semesters } from '../db/schema';
import type { Course, Section, TimeSlot } from '../src/types';
import type {
  CourseDataSource,
  CourseDetailsResult,
  CourseSearchFilters,
  CourseSearchResult,
  CoursesResolutionResult,
  SectionPairSelection,
  SectionsResolutionResult,
  SemesterSummary,
  SubjectSummary,
} from './types';

function normalizeCourseCode(code: string): string {
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

function normalizeSectionNumber(sectionNumber: string): string {
  return sectionNumber.trim().toUpperCase();
}

function mapCourseRow(row: {
  id: string;
  courseCode: string;
  name: string;
  subject: string;
  credits: number;
  description: string | null;
}): Course {
  return {
    id: row.id,
    code: row.courseCode,
    name: row.name,
    subject: row.subject,
    credits: row.credits,
    description: row.description ?? undefined,
  };
}

function mapSectionRow(row: {
  id: string;
  courseId: string;
  sectionNumber: string;
  instructor: string;
  capacity: number;
  enrolled: number;
  timeSlots: unknown;
}): Section {
  return {
    id: row.id,
    courseId: row.courseId,
    sectionNumber: row.sectionNumber,
    instructor: row.instructor,
    capacity: row.capacity,
    enrolled: row.enrolled,
    timeSlots: (Array.isArray(row.timeSlots) ? row.timeSlots : []) as TimeSlot[],
  };
}

const COURSE_COLUMNS = {
  id: semesterCourses.id,
  courseCode: semesterCourses.courseCode,
  name: semesterCourses.name,
  subject: semesterCourses.subject,
  credits: semesterCourses.credits,
  description: semesterCourses.description,
};

const SECTION_COLUMNS = {
  id: semesterSections.id,
  courseId: semesterSections.courseId,
  sectionNumber: semesterSections.sectionNumber,
  instructor: semesterSections.instructor,
  capacity: semesterSections.capacity,
  enrolled: semesterSections.enrolled,
  timeSlots: semesterSections.timeSlots,
};

/**
 * PostgreSQL/Drizzle implementation of CourseDataSource.
 * Queries ONLY semesters, semester_courses, and semester_sections with explicit column selection.
 */
export class DbCourseDataSource implements CourseDataSource {
  async listSemesters(): Promise<SemesterSummary[]> {
    const rows = await db
      .select({
        id: semesters.id,
        name: semesters.name,
        isActive: semesters.isActive,
      })
      .from(semesters)
      .orderBy(desc(semesters.createdAt));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: Boolean(row.isActive),
    }));
  }

  async listSubjects(semesterId: string): Promise<SubjectSummary[]> {
    const rows = await db
      .select({
        subject: semesterCourses.subject,
        courseCount: sql<number>`count(*)`,
      })
      .from(semesterCourses)
      .where(eq(semesterCourses.semesterId, semesterId))
      .groupBy(semesterCourses.subject)
      .orderBy(asc(semesterCourses.subject));

    return rows.map((row) => ({
      subject: row.subject,
      courseCount: Number(row.courseCount ?? 0),
    }));
  }

  async searchCourses(filters: CourseSearchFilters): Promise<CourseSearchResult> {
    const { semesterId, q, subject, openSeatsOnly, minCredits, maxCredits, limit, offset } =
      filters;

    const conditions = [eq(semesterCourses.semesterId, semesterId)];

    if (subject && subject.toLowerCase() !== 'all') {
      conditions.push(ilike(semesterCourses.subject, subject.trim()));
    }

    if (typeof minCredits === 'number') {
      conditions.push(gte(semesterCourses.credits, minCredits));
    }

    if (typeof maxCredits === 'number') {
      conditions.push(lte(semesterCourses.credits, maxCredits));
    }

    if (q?.trim()) {
      const searchTerm = `%${q.trim()}%`;

      const matchingSectionCourses = await db
        .select({ courseId: semesterSections.courseId })
        .from(semesterSections)
        .where(
          and(
            eq(semesterSections.semesterId, semesterId),
            ilike(semesterSections.instructor, searchTerm),
          ),
        );

      const instructorCourseIds = [...new Set(matchingSectionCourses.map((s) => s.courseId))];
      const searchFilters = [
        ilike(semesterCourses.courseCode, searchTerm),
        ilike(semesterCourses.name, searchTerm),
        ilike(semesterCourses.description, searchTerm),
      ];

      if (instructorCourseIds.length > 0) {
        searchFilters.push(inArray(semesterCourses.id, instructorCourseIds));
      }

      const searchCondition = or(...searchFilters);
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (openSeatsOnly) {
      const openSeatSections = await db
        .select({ courseId: semesterSections.courseId })
        .from(semesterSections)
        .where(
          and(
            eq(semesterSections.semesterId, semesterId),
            or(
              eq(semesterSections.capacity, 0),
              sql`${semesterSections.enrolled} < ${semesterSections.capacity}`,
            ),
          ),
        );

      const openSeatCourseIds = [...new Set(openSeatSections.map((s) => s.courseId))];
      if (openSeatCourseIds.length === 0) {
        return { courses: [], sections: [], total: 0 };
      }
      conditions.push(inArray(semesterCourses.id, openSeatCourseIds));
    }

    const matchedCourses = await db
      .select(COURSE_COLUMNS)
      .from(semesterCourses)
      .where(and(...conditions))
      .orderBy(asc(semesterCourses.courseCode))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(semesterCourses)
      .where(and(...conditions));

    const total = Number(countResult?.count ?? 0);
    const matchedCourseIds = matchedCourses.map((c) => c.id);

    const matchedSections =
      matchedCourseIds.length > 0
        ? await db
            .select(SECTION_COLUMNS)
            .from(semesterSections)
            .where(
              and(
                eq(semesterSections.semesterId, semesterId),
                inArray(semesterSections.courseId, matchedCourseIds),
              ),
            )
            .orderBy(asc(semesterSections.sectionNumber))
        : [];

    return {
      courses: matchedCourses.map(mapCourseRow),
      sections: matchedSections.map(mapSectionRow),
      total,
    };
  }

  async getCourseDetails(
    semesterId: string,
    identifier: { courseId?: string; courseCode?: string },
  ): Promise<CourseDetailsResult | null> {
    let courseRow: {
      id: string;
      courseCode: string;
      name: string;
      subject: string;
      credits: number;
      description: string | null;
    } | null = null;

    if (identifier.courseId?.trim()) {
      const rows = await db
        .select(COURSE_COLUMNS)
        .from(semesterCourses)
        .where(
          and(
            eq(semesterCourses.semesterId, semesterId),
            eq(semesterCourses.id, identifier.courseId.trim()),
          ),
        )
        .limit(1);
      courseRow = rows[0] ?? null;
    } else if (identifier.courseCode?.trim()) {
      const normalized = normalizeCourseCode(identifier.courseCode);
      const rows = await db
        .select(COURSE_COLUMNS)
        .from(semesterCourses)
        .where(
          and(
            eq(semesterCourses.semesterId, semesterId),
            sql`UPPER(REPLACE(${semesterCourses.courseCode}, ' ', '')) = ${normalized}`,
          ),
        )
        .limit(1);
      courseRow = rows[0] ?? null;
    }

    if (!courseRow) {
      return null;
    }

    const sectionRows = await db
      .select(SECTION_COLUMNS)
      .from(semesterSections)
      .where(
        and(
          eq(semesterSections.semesterId, semesterId),
          eq(semesterSections.courseId, courseRow.id),
        ),
      )
      .orderBy(asc(semesterSections.sectionNumber));

    return {
      course: mapCourseRow(courseRow),
      sections: sectionRows.map(mapSectionRow),
    };
  }

  async getCoursesByIdentifiers(
    semesterId: string,
    identifiers: { courseIds?: string[]; courseCodes?: string[] },
  ): Promise<CoursesResolutionResult> {
    const requestedIds = (identifiers.courseIds ?? []).map((id) => id.trim()).filter(Boolean);
    const requestedCodes = (identifiers.courseCodes ?? []).map((c) => c.trim()).filter(Boolean);

    if (requestedIds.length === 0 && requestedCodes.length === 0) {
      return { courses: [], sections: [], missing: [] };
    }

    const filterClauses = [];
    if (requestedIds.length > 0) {
      filterClauses.push(inArray(semesterCourses.id, requestedIds));
    }
    if (requestedCodes.length > 0) {
      const normalizedCodes = [...new Set(requestedCodes.map(normalizeCourseCode))];
      filterClauses.push(
        inArray(sql`UPPER(REPLACE(${semesterCourses.courseCode}, ' ', ''))`, normalizedCodes),
      );
    }

    const orClause = filterClauses.length === 1 ? filterClauses[0] : or(...filterClauses);

    const matchedCourseRows = await db
      .select(COURSE_COLUMNS)
      .from(semesterCourses)
      .where(and(eq(semesterCourses.semesterId, semesterId), orClause))
      .orderBy(asc(semesterCourses.courseCode));

    const foundById = new Set(matchedCourseRows.map((c) => c.id));
    const foundByNormalizedCode = new Set(
      matchedCourseRows.map((c) => normalizeCourseCode(c.courseCode)),
    );

    const missing: string[] = [];
    for (const id of requestedIds) {
      if (!foundById.has(id)) missing.push(id);
    }
    for (const code of requestedCodes) {
      if (!foundByNormalizedCode.has(normalizeCourseCode(code))) missing.push(code);
    }

    const courseIds = matchedCourseRows.map((c) => c.id);
    const matchedSectionRows =
      courseIds.length > 0
        ? await db
            .select(SECTION_COLUMNS)
            .from(semesterSections)
            .where(
              and(
                eq(semesterSections.semesterId, semesterId),
                inArray(semesterSections.courseId, courseIds),
              ),
            )
            .orderBy(asc(semesterSections.sectionNumber))
        : [];

    return {
      courses: matchedCourseRows.map(mapCourseRow),
      sections: matchedSectionRows.map(mapSectionRow),
      missing,
    };
  }

  async getSectionsByIds(
    semesterId: string,
    sectionIds: string[],
  ): Promise<SectionsResolutionResult> {
    const cleanIds = [...new Set(sectionIds.map((id) => id.trim()).filter(Boolean))];
    if (cleanIds.length === 0) {
      return { courses: [], sections: [], missing: [] };
    }

    const matchedSectionRows = await db
      .select(SECTION_COLUMNS)
      .from(semesterSections)
      .where(
        and(eq(semesterSections.semesterId, semesterId), inArray(semesterSections.id, cleanIds)),
      );

    const foundIds = new Set(matchedSectionRows.map((s) => s.id));
    const missing = cleanIds.filter((id) => !foundIds.has(id));

    const courseIds = [...new Set(matchedSectionRows.map((s) => s.courseId))];
    const matchedCourseRows =
      courseIds.length > 0
        ? await db
            .select(COURSE_COLUMNS)
            .from(semesterCourses)
            .where(
              and(
                eq(semesterCourses.semesterId, semesterId),
                inArray(semesterCourses.id, courseIds),
              ),
            )
        : [];

    return {
      courses: matchedCourseRows.map(mapCourseRow),
      sections: matchedSectionRows.map(mapSectionRow),
      missing,
    };
  }

  async getSectionsByCourseAndNumber(
    semesterId: string,
    pairs: SectionPairSelection[],
  ): Promise<SectionsResolutionResult> {
    if (pairs.length === 0) {
      return { courses: [], sections: [], missing: [] };
    }

    const uniqueCodes = [...new Set(pairs.map((p) => p.courseCode.trim()).filter(Boolean))];
    const resolved = await this.getCoursesByIdentifiers(semesterId, { courseCodes: uniqueCodes });

    const courseByNormalizedCode = new Map(
      resolved.courses.map((c) => [normalizeCourseCode(c.code), c]),
    );
    const sectionsByCourseId = new Map<string, Section[]>();
    for (const section of resolved.sections) {
      const list = sectionsByCourseId.get(section.courseId) ?? [];
      list.push(section);
      sectionsByCourseId.set(section.courseId, list);
    }

    const matchedSections: Section[] = [];
    const seenSectionIds = new Set<string>();
    const matchedCourseIds = new Set<string>();
    const missing: string[] = [];

    for (const pair of pairs) {
      const course = courseByNormalizedCode.get(normalizeCourseCode(pair.courseCode));
      if (!course) {
        missing.push(`${pair.courseCode} (${pair.sectionNumber})`);
        continue;
      }
      const targetNum = normalizeSectionNumber(pair.sectionNumber);
      const section = (sectionsByCourseId.get(course.id) ?? []).find(
        (s) => normalizeSectionNumber(s.sectionNumber) === targetNum,
      );
      if (!section) {
        missing.push(`${course.code} (${pair.sectionNumber})`);
        continue;
      }
      if (!seenSectionIds.has(section.id)) {
        seenSectionIds.add(section.id);
        matchedSections.push(section);
        matchedCourseIds.add(course.id);
      }
    }

    return {
      courses: resolved.courses.filter((c) => matchedCourseIds.has(c.id)),
      sections: matchedSections,
      missing,
    };
  }
}
