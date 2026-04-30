import { neon } from '@netlify/neon';
import { and, eq, ilike, sql, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../db/schema';
import { validateToken } from './lib/auth';

const client = neon();
const db = drizzle({ client, schema });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const { httpMethod, queryStringParameters, body } = event;

  // Simple path routing
  // Expected paths:
  // GET /professors -> List
  // GET /professors?id=123 -> Detail
  // POST /professors (with action in body or separate endpoint)

  const id = queryStringParameters?.id;
  const action = queryStringParameters?.action;

  try {
    if (httpMethod === 'GET') {
      if (id) {
        // GET detail
        const professorId = parseInt(id);
        const professor = await db.query.professors.findFirst({
          where: eq(schema.professors.id, professorId),
        });

        if (!professor) {
          return jsonResponse(404, { error: 'Professor not found' });
        }

        const ratings = await db.query.professorRatings.findMany({
          where: eq(schema.professorRatings.professorId, professorId),
          orderBy: [desc(schema.professorRatings.createdAt)],
        });

        return jsonResponse(200, { professor, ratings });
      } else {
        // GET list
        const search = queryStringParameters?.search || '';
        const subject = queryStringParameters?.subject || '';
        const semester = queryStringParameters?.semester || '';

        const query = db.select().from(schema.professors);

        const conditions = [];
        if (search) {
          conditions.push(ilike(schema.professors.name, `%${search}%`));
        }
        if (subject) {
          // subjects is a jsonb array
          conditions.push(
            sql`${schema.professors.subjects} @> ${JSON.stringify([subject])}::jsonb`,
          );
        }
        if (semester) {
          // semesters is a jsonb array
          conditions.push(
            sql`${schema.professors.semesters} @> ${JSON.stringify([semester])}::jsonb`,
          );
        }

        const professors = await query
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(schema.professors.avgRating))
          .limit(100);

        return jsonResponse(200, { professors });
      }
    }

    if (httpMethod === 'POST') {
      if (action === 'sync') {
        return await handleSync();
      }

      if (action === 'rate') {
        const user = await validateToken(event.headers.authorization);
        const ratingData = JSON.parse(body);
        return await handleRate(user, ratingData);
      }
    }

    return jsonResponse(404, { error: 'Not Found' });
  } catch (error: any) {
    console.error('Error:', error);
    return jsonResponse(500, { error: error.message });
  }
};

async function handleRate(user: any, data: any) {
  const {
    professorId,
    courseCode,
    rating,
    difficulty,
    takeAgain,
    chillness,
    strictness,
    tags,
    comment,
  } = data;

  if (!professorId || !rating || !difficulty) {
    return jsonResponse(400, { error: 'Missing required fields' });
  }

  await db.transaction(async (tx) => {
    // 1. Insert rating
    await tx.insert(schema.professorRatings).values({
      professorId,
      auth0UserId: user.sub,
      userDisplayName: user.name,
      courseCode,
      rating,
      difficulty,
      takeAgain,
      chillness,
      strictness,
      tags,
      comment,
    });

    // 2. Update professor aggregates
    const ratings = await tx
      .select()
      .from(schema.professorRatings)
      .where(eq(schema.professorRatings.professorId, professorId));

    const totalRatings = ratings.length;
    const avgRating = ratings.reduce((acc, r) => acc + r.rating, 0) / totalRatings;
    const avgDifficulty = ratings.reduce((acc, r) => acc + r.difficulty, 0) / totalRatings;
    const avgChillness = ratings.reduce((acc, r) => acc + r.chillness, 0) / totalRatings;
    const avgStrictness = ratings.reduce((acc, r) => acc + r.strictness, 0) / totalRatings;
    const takeAgainCount = ratings.filter((r) => r.takeAgain).length;
    const takeAgainPercent = Math.round((takeAgainCount / totalRatings) * 100);

    await tx
      .update(schema.professors)
      .set({
        avgRating,
        avgDifficulty,
        avgChillness,
        avgStrictness,
        takeAgainPercent,
        totalRatings,
        updatedAt: new Date(),
      })
      .where(eq(schema.professors.id, professorId));
  });

  return jsonResponse(200, { message: 'Rating submitted successfully' });
}

async function handleSync() {
  // 1. Fetch active semesters
  const activeSemesters = await db
    .select()
    .from(schema.semesters)
    .where(eq(schema.semesters.isActive, true));

  let totalSynced = 0;

  for (const semester of activeSemesters) {
    if (!semester.jsonUrl) continue;

    try {
      // In a real environment, we would fetch the JSON.
      // Since we are in Netlify function, we can use fetch if it's available (it is in Node 18+)
      const response = await fetch(semester.jsonUrl);
      if (!response.ok) continue;
      const data: any = await response.json();

      const professorsMap = new Map<string, Set<string>>(); // Name -> Subjects

      for (const section of data.sections) {
        if (!section.instructor || section.instructor === 'To Be Announced') continue;

        const instructors = section.instructor.split(',').map((s: string) => s.trim());
        for (const name of instructors) {
          if (!professorsMap.has(name)) {
            professorsMap.set(name, new Set());
          }
          if (section.subject) {
            professorsMap.get(name)!.add(section.subject);
          }
        }
      }

      for (const [name, subjects] of professorsMap.entries()) {
        const subjectsArray = Array.from(subjects);

        // Upsert professor
        const existing = await db.query.professors.findFirst({
          where: eq(schema.professors.name, name),
        });

        if (existing) {
          // Update subjects and semesters
          const mergedSubjects = Array.from(
            new Set([...(existing.subjects as string[]), ...subjectsArray]),
          );
          const mergedSemesters = Array.from(
            new Set([...(existing.semesters as string[]), semester.id]),
          );
          await db
            .update(schema.professors)
            .set({
              subjects: mergedSubjects,
              semesters: mergedSemesters,
              updatedAt: new Date(),
            })
            .where(eq(schema.professors.id, existing.id));
        } else {
          await db.insert(schema.professors).values({
            name,
            subjects: subjectsArray,
            semesters: [semester.id],
          });
          totalSynced++;
        }
      }
    } catch (err) {
      console.error(`Failed to sync semester ${semester.id}:`, err);
    }
  }

  return jsonResponse(200, { message: 'Sync completed', professorsSynced: totalSynced });
}
