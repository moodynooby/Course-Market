import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@netlify/neon';
import { eq, sql, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { ZodError } from 'zod';
import * as schema from '../../db/schema';
import { formatZodError, professorRatingSchema } from '../../src/lib/schemas';
import { validateToken } from './lib/auth';

const client = neon();
const db = drizzle({ client, schema });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(statusCode: number, body: object) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function syncProfessors(dbInstance: any, semesterId?: string, siteUrl?: string) {
  const semestersQuery = await dbInstance.select().from(schema.semesters);
  const semestersToProcess = semesterId
    ? semestersQuery.filter((s: any) => s.id === semesterId)
    : semestersQuery;

  const allInstructors = new Set<string>();

  for (const semester of semestersToProcess) {
    if (!semester.jsonUrl) continue;
    try {
      let url = semester.jsonUrl;
      let data: any;

      if (!url.startsWith('http') && !siteUrl) {
        // Local fallback when running via CLI
        const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
        const filePath = path.join(process.cwd(), 'public', cleanUrl);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(fileContent);
      } else {
        if (!url.startsWith('http') && siteUrl) {
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
        data = await response.json();
      }

      if (data.sections && Array.isArray(data.sections)) {
        for (const section of data.sections) {
          if (section.instructor) {
            const names = section.instructor
              .split(',')
              .map((s: string) => s.trim().replace(/\.\.\.$/, ''));
            for (const name of names) {
              if (name && name !== 'Not added' && name !== 'To Be Announced' && name !== 'TBA') {
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
  let processedCount = 0;

  const CHUNK_SIZE = 100;
  for (let i = 0; i < instructorsList.length; i += CHUNK_SIZE) {
    const chunk = instructorsList.slice(i, i + CHUNK_SIZE);
    const valuesToInsert = chunk.map((name) => ({
      name,
      updatedAt: new Date(),
    }));

    try {
      await dbInstance
        .insert(schema.professors)
        .values(valuesToInsert)
        .onConflictDoUpdate({
          target: schema.professors.name,
          set: { updatedAt: new Date() },
        });
      processedCount += chunk.length;
    } catch (e) {
      console.error('Bulk insert error:', e);
    }
  }

  return {
    instructorsFound: instructorsList.length,
    processed: processedCount,
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const { httpMethod, path, body } = event;
  const pathParts = path.split('/').filter(Boolean);

  try {
    // Public GET routes
    if (httpMethod === 'GET') {
      // GET /professors
      if (path.endsWith('/professors')) {
        let professors = await db
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

        // Auto-sync if empty
        if (professors.length === 0) {
          console.log('No professors found, triggering auto-sync...');
          const host = event.headers.host || 'localhost:8888';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          const siteUrl = `${protocol}://${host}`;

          const { instructorsFound } = await syncProfessors(db, undefined, siteUrl);

          if (instructorsFound > 0) {
            // Re-fetch
            professors = await db
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
          }
        }

        return jsonResponse(200, { professors });
      }

      // GET /professors/:id
      const id = parseInt(pathParts[pathParts.length - 1]);
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
        const host = event.headers.host || 'localhost:8888';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const siteUrl = `${protocol}://${host}`;

        const result = await syncProfessors(db, undefined, siteUrl);

        return jsonResponse(200, {
          message: 'Sync completed',
          ...result,
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
