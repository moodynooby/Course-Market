import { neon } from '@netlify/neon';
import { desc } from 'drizzle-orm';
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

// Aggressive caching: 1 hour for CDN and browser
const cacheHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600', // 1 hour
  'CDN-Cache-Control': 'public, max-age=3600',
  'Netlify-CDN-Cache-Control': 'public, max-age=3600',
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
    const { httpMethod } = event;

    // GET: Fetch all semesters from database
    if (httpMethod === 'GET') {
      // Fetch semesters directly from database, ordered by creation date
      const semesters = await db
        .select()
        .from(schema.semesters)
        .orderBy(desc(schema.semesters.createdAt));

      return jsonResponse(200, { semesters });
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
