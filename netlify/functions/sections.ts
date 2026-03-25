import { neon } from '@netlify/neon';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../db/schema';

const client = neon();
const db = drizzle({ client, schema });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Aggressive caching: 24 hours for CDN and browser
const cacheHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=86400', // 24 hours
  'CDN-Cache-Control': 'public, max-age=86400',
  'Netlify-CDN-Cache-Control': 'public, max-age=86400',
};

function jsonResponse(
  statusCode: number,
  body: object,
  headers: Record<string, string> = cacheHeaders,
) {
  return {
    statusCode,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const { httpMethod, queryStringParameters } = event;
    const { semester } = queryStringParameters || {};

    // GET: Fetch sections index for a specific semester
    if (httpMethod === 'GET') {
      if (!semester) {
        return jsonResponse(400, { error: 'Missing required parameter: semester' });
      }

      // Fetch semester metadata to get JSON URL
      const [semesterData] = await db
        .select()
        .from(schema.semesters)
        .where(eq(schema.semesters.id, semester));

      if (!semesterData) {
        return jsonResponse(404, { error: `Semester '${semester}' not found` });
      }

      // Fetch sections index (lightweight, without full time slot data)
      const sections = await db
        .select()
        .from(schema.sections)
        .where(eq(schema.sections.semesterId, semester));

      return jsonResponse(200, {
        sections,
        jsonUrl: semesterData.jsonUrl,
        semester,
        count: sections.length,
      });
    }

    return jsonResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('Handler error:', error);

    return jsonResponse(500, {
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
};
