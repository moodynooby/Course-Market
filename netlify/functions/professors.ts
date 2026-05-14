import { desc, eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { formatZodError, professorRatingSchema } from '../../db/validation';
import { validateToken } from './lib/auth';
import { corsResponse, jsonResponse } from './lib/response';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  const { httpMethod, path, body } = event;
  const pathParts = path.split('/').filter(Boolean);

  try {
    // Public GET routes
    if (httpMethod === 'GET') {
      // GET /professors
      if (path.endsWith('/professors')) {
        const professors = await db
          .select({
            id: schema.professors.id,
            name: schema.professors.name,
            department: schema.professors.department,
            avgRating: sql<number>`COALESCE(avg(${schema.professorRatings.rating}), 0)`,
            avgDifficulty: sql<number>`COALESCE(avg(${schema.professorRatings.difficulty}), 0)`,
            ratingCount: sql<number>`count(${schema.professorRatings.id})`,
          })
          .from(schema.professors)
          .leftJoin(
            schema.professorRatings,
            eq(schema.professors.id, schema.professorRatings.professorId),
          )
          .groupBy(schema.professors.id)
          .orderBy(schema.professors.name);

        return jsonResponse(200, { professors });
      }

      // GET /professors/:id
      const id = parseInt(pathParts[pathParts.length - 1], 10);
      if (!Number.isNaN(id)) {
        const [professor] = await db
          .select({
            id: schema.professors.id,
            name: schema.professors.name,
            department: schema.professors.department,
            avgRating: sql<number>`COALESCE(avg(${schema.professorRatings.rating}), 0)`,
            avgDifficulty: sql<number>`COALESCE(avg(${schema.professorRatings.difficulty}), 0)`,
            ratingCount: sql<number>`count(${schema.professorRatings.id})`,
          })
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
          .select()
          .from(schema.professorRatings)
          .where(eq(schema.professorRatings.professorId, id))
          .orderBy(desc(schema.professorRatings.createdAt));

        return jsonResponse(200, { professor: { ...professor, ratings } });
      }
    }

    // Protected routes
    const user = await validateToken(event.headers.authorization);

    if (httpMethod === 'POST') {
      // POST /professors/rate
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

      // POST /professors/sync
      if (path.endsWith('/sync')) {
        const semesters = await db.select().from(schema.semesters);
        const allInstructors = new Set<string>();

        // We assume the function is running on Netlify or locally where the JSON files are accessible via URL or filesystem
        // Since it's a Netlify function, it might be better to fetch from the URL if provided,
        // but for local dev we can't easily fetch from localhost:8888.
        // The AGENTS.md says: "Fetch JSON directly from CDN (/semesters/*.json)"
        // In the function, we can try to fetch from the site's own URL.

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
                  const names = section.instructor
                    .split(',')
                    .map((s: string) => s.trim().replace(/\.\.\.$/, ''));
                  for (const name of names) {
                    if (
                      name &&
                      name !== 'Not added' &&
                      name !== 'To Be Announced' &&
                      name !== 'TBA'
                    ) {
                      allInstructors.add(name);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Error processing semester ${semester.id}:`, e);
          }
        }

        const instructorsList = Array.from(allInstructors);
        let addedCount = 0;

        for (const name of instructorsList) {
          try {
            await db.insert(schema.professors).values({ name }).onConflictDoNothing();
            addedCount++;
          } catch (_e) {
            // Ignore individual insert errors
          }
        }

        return jsonResponse(200, {
          message: 'Sync completed',
          instructorsFound: instructorsList.length,
          processed: addedCount,
        });
      }
    }

    return jsonResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('Handler error:', error);

    if (error instanceof Error && error.message.includes('authorization')) {
      return jsonResponse(401, {
        error: 'Unauthorized',
        message: error.message,
      });
    }

    return jsonResponse(500, {
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
};
