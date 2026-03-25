import { neon } from '@netlify/neon';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../db/schema';
import { validateToken } from './lib/auth';

const client = neon();
const db = drizzle({ client, schema });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(statusCode: number, body: object, headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers: { ...corsHeaders, ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Simple rate limiting: check last load time
async function checkRateLimit(): Promise<{ allowed: boolean; lastLoad?: Date }> {
  const recentLoads = await db
    .select()
    .from(schema.semesters)
    .where(eq(schema.semesters.loadedAt, db.literals.literal("NOW() - INTERVAL '1 minute'")))
    .limit(1);

  if (recentLoads.length > 0) {
    return { allowed: false, lastLoad: new Date() };
  }

  return { allowed: true };
}

// Check if user has admin role
function isAdmin(user: any): boolean {
  // Check for admin role in Auth0 claims
  // You may need to adjust this based on your Auth0 configuration
  const roles = (user as any)['https://aurais.netlify.app/roles'] || [];
  return roles.includes('admin') || (user as any).email?.endsWith('@admin.com');
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const user = await validateToken(event.headers.authorization);

    // Check admin access
    if (!isAdmin(user)) {
      return jsonResponse(403, {
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }

    const { httpMethod, body } = event;
    const requestBody = body ? JSON.parse(body) : {};

    if (httpMethod === 'POST') {
      const { semesterId, name, courses: coursesData, sections: sectionsData } = requestBody;

      if (!semesterId || !name || !coursesData || !sectionsData) {
        return jsonResponse(400, {
          error: 'Missing required fields: semesterId, name, courses, sections',
        });
      }

      // Check rate limit
      const rateLimit = await checkRateLimit();
      if (!rateLimit.allowed) {
        return jsonResponse(429, {
          error: 'Rate limit exceeded',
          message: 'Please wait 1 minute between semester loads',
          lastLoad: rateLimit.lastLoad,
        });
      }

      // Start a transaction
      await db.transaction(async (tx) => {
        // Insert or update semester metadata
        await tx
          .insert(schema.semesters)
          .values({
            id: semesterId,
            name,
            jsonUrl: `/semesters/${semesterId}_sections.json`,
            isActive: true,
            loadedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.semesters.id,
            set: {
              name,
              jsonUrl: `/semesters/${semesterId}_sections.json`,
              isActive: true,
              loadedAt: new Date(),
            },
          });

        // Insert courses (delete old ones first if exists)
        await tx.delete(schema.courses).where(eq(schema.courses.semesterId, semesterId));

        if (coursesData.length > 0) {
          await tx.insert(schema.courses).values(
            coursesData.map((c: any) => ({
              semesterId,
              code: c.code,
              name: c.name,
              subject: c.subject,
              credits: c.credits,
              description: c.description || null,
            })),
          );
        }

        // Insert sections (delete old ones first if exists)
        await tx.delete(schema.sections).where(eq(schema.sections.semesterId, semesterId));

        if (sectionsData.length > 0) {
          await tx.insert(schema.sections).values(
            sectionsData.map((s: any, index: number) => ({
              id: s.id || `${s.courseId}-${s.sectionNumber}-${semesterId}`,
              courseId: s.courseId,
              semesterId,
              sectionNumber: s.sectionNumber,
              instructor: s.instructor || null,
              capacity: s.capacity || null,
              enrolled: s.enrolled || null,
              jsonIndex: index,
            })),
          );
        }
      });

      return jsonResponse(200, {
        success: true,
        message: `Semester '${semesterId}' loaded successfully`,
        coursesCount: coursesData?.length || 0,
        sectionsCount: sectionsData?.length || 0,
      });
    }

    return jsonResponse(404, { error: 'Method not allowed' });
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
