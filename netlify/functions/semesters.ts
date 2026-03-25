import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../db/schema';
import * as fs from 'fs';
import * as path from 'path';

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

    // GET: Fetch all active semesters from public/semesters folder
    if (httpMethod === 'GET') {
      // Read JSON files from public/semesters folder
      const semestersDir = path.join(process.cwd(), 'public', 'semesters');

      let files: string[];
      try {
        files = fs.readdirSync(semestersDir).filter((f) => f.endsWith('.json'));
      } catch (err) {
        console.debug(err);
        // Folder doesn't exist yet, return empty list
        return jsonResponse(200, { semesters: [] });
      }

      const semesters = files.map((file) => {
        const filePath = path.join(semestersDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Use semesterId from JSON, lowercase it for database consistency
        const semesterId = (data.semesterId || file.replace('.json', '')).toLowerCase();
        const semesterName = data.semesterName || file.replace('.json', '');

        return {
          id: semesterId,
          name: semesterName,
          jsonUrl: `/semesters/${file}`,
          isActive: true,
        };
      });

      // Sync with database
      for (const sem of semesters) {
        await db
          .insert(schema.semesters)
          .values(sem)
          .onConflictDoUpdate({
            target: schema.semesters.id,
            set: {
              name: sem.name,
              jsonUrl: sem.jsonUrl,
              isActive: sem.isActive,
            },
          });
      }

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
