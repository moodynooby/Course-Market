import { and, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { courseSearchQuerySchema, formatZodError } from '../../db/validation';
import type { Course, Section, TimeSlot } from '../../src/types';
import { jsonResponse } from './lib/response';
import { withCors } from './lib/wrap';

export const handler = withCors(async (event) => {
  const { httpMethod, queryStringParameters = {} } = event;

  if (httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const parseResult = courseSearchQuerySchema.safeParse(queryStringParameters ?? {});
  if (!parseResult.success) {
    return jsonResponse(400, formatZodError(parseResult.error));
  }

  const { semesterId, q, subject, openSeatsOnly, limit, offset } = parseResult.data;

  const conditions = [eq(schema.semesterCourses.semesterId, semesterId)];

  if (subject && subject !== 'all') {
    conditions.push(eq(schema.semesterCourses.subject, subject));
  }

  if (q?.trim()) {
    const searchTerm = `%${q.trim()}%`;

    const matchingSectionCourses = await db
      .select({ courseId: schema.semesterSections.courseId })
      .from(schema.semesterSections)
      .where(
        and(
          eq(schema.semesterSections.semesterId, semesterId),
          ilike(schema.semesterSections.instructor, searchTerm),
        ),
      );

    const instructorCourseIds = matchingSectionCourses.map((s) => s.courseId);

    const searchFilters = [
      ilike(schema.semesterCourses.courseCode, searchTerm),
      ilike(schema.semesterCourses.name, searchTerm),
      ilike(schema.semesterCourses.description, searchTerm),
    ];

    if (instructorCourseIds.length > 0) {
      searchFilters.push(inArray(schema.semesterCourses.id, instructorCourseIds));
    }

    const searchCondition = or(...searchFilters);
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (openSeatsOnly === 'true') {
    const openSeatSections = await db
      .select({ courseId: schema.semesterSections.courseId })
      .from(schema.semesterSections)
      .where(
        and(
          eq(schema.semesterSections.semesterId, semesterId),
          or(
            eq(schema.semesterSections.capacity, 0),
            sql`${schema.semesterSections.enrolled} < ${schema.semesterSections.capacity}`,
          ),
        ),
      );

    const openSeatCourseIds = [...new Set(openSeatSections.map((s) => s.courseId))];
    if (openSeatCourseIds.length === 0) {
      return jsonResponse(200, { courses: [], sections: [], total: 0 });
    }
    conditions.push(inArray(schema.semesterCourses.id, openSeatCourseIds));
  }

  const matchedCourses = await db
    .select()
    .from(schema.semesterCourses)
    .where(and(...conditions))
    .orderBy(asc(schema.semesterCourses.courseCode))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.semesterCourses)
    .where(and(...conditions));

  const total = Number(countResult?.count ?? 0);

  const matchedCourseIds = matchedCourses.map((c) => c.id);
  const matchedSections =
    matchedCourseIds.length > 0
      ? await db
          .select()
          .from(schema.semesterSections)
          .where(
            and(
              eq(schema.semesterSections.semesterId, semesterId),
              inArray(schema.semesterSections.courseId, matchedCourseIds),
            ),
          )
      : [];

  const courses: Course[] = matchedCourses.map((c) => ({
    id: c.id,
    code: c.courseCode,
    name: c.name,
    subject: c.subject,
    credits: c.credits,
    description: c.description ?? undefined,
  }));

  const sections: Section[] = matchedSections.map((s) => ({
    id: s.id,
    courseId: s.courseId,
    sectionNumber: s.sectionNumber,
    instructor: s.instructor,
    capacity: s.capacity,
    enrolled: s.enrolled,
    timeSlots: (s.timeSlots ?? []) as TimeSlot[],
  }));

  return jsonResponse(200, {
    courses,
    sections,
    total,
  });
});
