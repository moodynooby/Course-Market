import { desc, eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { formatZodError, professorRatingSchema } from '../../db/validation';
import { splitInstructorNames } from '../../src/utils/instructor-name';
import { validateToken } from './lib/auth';
import { corsResponse, jsonResponse, secureErrorResponse } from './lib/response';

const professorWithStats = {
  id: schema.professors.id,
  name: schema.professors.name,
  avgRating: sql<number>`COALESCE(avg(${schema.professorRatings.rating}), 0)`,
  avgDifficulty: sql<number>`COALESCE(avg(${schema.professorRatings.difficulty}), 0)`,
  ratingCount: sql<number>`count(${schema.professorRatings.id})`,
} as const;

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  const { httpMethod, path, body } = event;
  const pathParts = path.split('/').filter(Boolean);

  try {
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

        const semesters = await db
          .select({ id: schema.semesters.id, name: schema.semesters.name })
          .from(schema.semesters);

        const results: { semester: string; courses: string[] }[] = [];

        for (const sem of semesters) {
          const sections = await db
            .select({
              courseCode: schema.semesterCourses.courseCode,
              instructor: schema.semesterSections.instructor,
            })
            .from(schema.semesterSections)
            .innerJoin(
              schema.semesterCourses,
              eq(schema.semesterSections.courseId, schema.semesterCourses.id),
            )
            .where(eq(schema.semesterSections.semesterId, sem.id));

          const courseCodes = new Set<string>();
          for (const section of sections) {
            if (splitInstructorNames(section.instructor).includes(professor.name)) {
              courseCodes.add(section.courseCode);
            }
          }
          if (courseCodes.size > 0) {
            results.push({ semester: sem.name, courses: Array.from(courseCodes).sort() });
          }
        }

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
          .select({
            // Explicitly select fields to prevent PII leakage (e.g. auth0UserId)
            id: schema.professorRatings.id,
            professorId: schema.professorRatings.professorId,
            rating: schema.professorRatings.rating,
            difficulty: schema.professorRatings.difficulty,
            comment: schema.professorRatings.comment,
            courseCode: schema.professorRatings.courseCode,
            semesterId: schema.professorRatings.semesterId,
            takeAgain: schema.professorRatings.takeAgain,
            createdAt: schema.professorRatings.createdAt,
          })
          .from(schema.professorRatings)
          .where(eq(schema.professorRatings.professorId, id))
          .orderBy(desc(schema.professorRatings.createdAt));

        return jsonResponse(200, { professor: { ...professor, ratings } });
      }
    }

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

        const [newRating] = await db
          .insert(schema.professorRatings)
          .values({
            ...requestBody,
            auth0UserId: user.sub,
          })
          .returning({
            id: schema.professorRatings.id,
            professorId: schema.professorRatings.professorId,
            rating: schema.professorRatings.rating,
            difficulty: schema.professorRatings.difficulty,
            comment: schema.professorRatings.comment,
            courseCode: schema.professorRatings.courseCode,
            semesterId: schema.professorRatings.semesterId,
            takeAgain: schema.professorRatings.takeAgain,
            createdAt: schema.professorRatings.createdAt,
          });

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
  } catch (error) {
    if (error instanceof Error && error.message.includes('authorization')) {
      return jsonResponse(401, {
        error: 'Unauthorized',
        message: error.message,
      });
    }

    return secureErrorResponse(error);
  }
};
