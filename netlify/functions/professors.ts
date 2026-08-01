import { desc, eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { formatZodError, professorRatingSchema } from '../../db/validation';
import { splitInstructorNames } from '../../src/utils/instructor-name';
import { validateToken } from './lib/auth';
import { jsonResponse } from './lib/response';
import { withCors } from './lib/wrap';

const professorWithStats = {
  id: schema.professors.id,
  name: schema.professors.name,
  avgRating: sql<number>`COALESCE(avg(${schema.professorRatings.rating}), 0)`,
  avgDifficulty: sql<number>`COALESCE(avg(${schema.professorRatings.difficulty}), 0)`,
  ratingCount: sql<number>`count(${schema.professorRatings.id})`,
} as const;

// Rating projection reused across select() and .returning() so the shape can't drift.
const ratingPublicColumns = {
  id: schema.professorRatings.id,
  professorId: schema.professorRatings.professorId,
  rating: schema.professorRatings.rating,
  difficulty: schema.professorRatings.difficulty,
  comment: schema.professorRatings.comment,
  courseCode: schema.professorRatings.courseCode,
  semesterId: schema.professorRatings.semesterId,
  takeAgain: schema.professorRatings.takeAgain,
  createdAt: schema.professorRatings.createdAt,
} as const;

export const handler = withCors(async (event) => {
  const { httpMethod, path, body } = event;
  const pathParts = path.split('/').filter(Boolean);

  if (httpMethod === 'GET') {
    if (path.endsWith('/professors')) {
      const professors = await db
        .select({ ...professorWithStats })
        .from(schema.professors)
        .leftJoin(
          schema.professorRatings,
          eq(schema.professors.id, schema.professorRatings.professorId),
        )
        .groupBy(schema.professors.id)
        .orderBy(schema.professors.name);

      return jsonResponse(200, { professors });
    }

    if (path.endsWith('/courses')) {
      const professorId = parseInt(pathParts[pathParts.length - 2], 10);
      if (Number.isNaN(professorId)) {
        return jsonResponse(400, { error: 'Invalid professor ID' });
      }

      const [professor] = await db
        .select()
        .from(schema.professors)
        .where(eq(schema.professors.id, professorId));

      if (!professor) {
        return jsonResponse(404, { error: 'Professor not found' });
      }

      // Single query instead of N+1: fetch all sections with their semester names at once
      const sections = await db
        .select({
          semesterName: schema.semesters.name,
          courseCode: schema.semesterCourses.courseCode,
          instructor: schema.semesterSections.instructor,
        })
        .from(schema.semesterSections)
        .innerJoin(
          schema.semesterCourses,
          eq(schema.semesterSections.courseId, schema.semesterCourses.id),
        )
        .innerJoin(schema.semesters, eq(schema.semesterSections.semesterId, schema.semesters.id));

      // Group by semester in JS — no further DB round-trips
      const semesterMap = new Map<string, Set<string>>();
      for (const section of sections) {
        if (splitInstructorNames(section.instructor).includes(professor.name)) {
          const existing = semesterMap.get(section.semesterName) ?? new Set<string>();
          existing.add(section.courseCode);
          semesterMap.set(section.semesterName, existing);
        }
      }

      const results = Array.from(semesterMap.entries()).map(([semester, codes]) => ({
        semester,
        courses: Array.from(codes).sort(),
      }));

      return jsonResponse(200, { coursesTaught: results });
    }

    const id = parseInt(pathParts[pathParts.length - 1], 10);
    if (!Number.isNaN(id)) {
      const [professor] = await db
        .select({ ...professorWithStats })
        .from(schema.professors)
        .where(eq(schema.professors.id, id))
        .leftJoin(
          schema.professorRatings,
          eq(schema.professors.id, schema.professorRatings.professorId),
        )
        .groupBy(schema.professors.id);

      if (!professor) {
        return jsonResponse(404, { error: 'Professor not found' });
      }

      const ratings = await db
        .select(ratingPublicColumns)
        .from(schema.professorRatings)
        .where(eq(schema.professorRatings.professorId, id))
        .orderBy(desc(schema.professorRatings.createdAt));

      return jsonResponse(200, { professor: { ...professor, ratings } });
    }
  }

  // Everything below requires auth.
  const user = await validateToken(event.headers.authorization);

  if (httpMethod === 'POST') {
    if (path.endsWith('/rate')) {
      let requestBody;
      try {
        requestBody = professorRatingSchema.parse(body ? JSON.parse(body) : {});
      } catch (e) {
        if (e instanceof ZodError) {
          return jsonResponse(400, formatZodError(e));
        }
        return jsonResponse(400, { error: 'Invalid JSON' });
      }

      // One rating per (user, professor); resubmit overwrites the previous row.
      const [newRating] = await db
        .insert(schema.professorRatings)
        .values({
          ...requestBody,
          auth0UserId: user.sub,
        })
        .onConflictDoUpdate({
          target: [schema.professorRatings.auth0UserId, schema.professorRatings.professorId],
          set: {
            rating: requestBody.rating,
            difficulty: requestBody.difficulty,
            comment: requestBody.comment,
            courseCode: requestBody.courseCode,
            semesterId: requestBody.semesterId,
            takeAgain: requestBody.takeAgain,
          },
        })
        .returning(ratingPublicColumns);

      return jsonResponse(201, { rating: newRating });
    }

    if (path.endsWith('/sync')) {
      const sections = await db
        .select({ instructor: schema.semesterSections.instructor })
        .from(schema.semesterSections);

      const allInstructors = new Set<string>();

      for (const section of sections) {
        if (section.instructor) {
          for (const name of splitInstructorNames(section.instructor)) {
            allInstructors.add(name);
          }
        }
      }

      const instructorsList = Array.from(allInstructors);

      if (instructorsList.length > 0) {
        await db
          .insert(schema.professors)
          .values(instructorsList.map((name) => ({ name })))
          .onConflictDoNothing();
      }

      return jsonResponse(200, {
        message: 'Sync completed',
        instructorsFound: instructorsList.length,
      });
    }
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
});
