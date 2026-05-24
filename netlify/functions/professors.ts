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
          .returning();

        return jsonResponse(201, { rating: newRating });
      }

      if (path.endsWith('/sync')) {
        const semesters = await db.select().from(schema.semesters);
        const allInstructors = new Set<string>();

        const host = event.headers.host || 'localhost:8888';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const siteUrl = `${protocol}://${host}`;

        for (const semester of semesters) {
          if (!semester.jsonUrl) continue;

          try {
            let url = semester.jsonUrl;
            if (!url.startsWith('http')) {
              url = `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;
            }

            console.log(`Syncing from ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
              const errorText = await response.text();
              console.error(
                `Failed to fetch ${url}: ${response.status} ${response.statusText} - ${errorText}`,
              );
              continue;
            }

            const data = (await response.json()) as { sections?: Array<{ instructor?: string }> };
            console.log(`Fetched ${data.sections?.length} sections from ${semester.id}`);
            if (data.sections && Array.isArray(data.sections)) {
              for (const section of data.sections) {
                if (section.instructor) {
                  for (const name of splitInstructorNames(section.instructor)) {
                    allInstructors.add(name);
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Error processing semester ${semester.id}:`, e);
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

    return secureErrorResponse(500, (error as Error).message, error);
  }
};
