import { desc } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { cacheHeaders, corsResponse, jsonResponse } from './lib/response';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  try {
    const { httpMethod } = event;

    if (httpMethod === 'GET') {
      const semesters = await db
        .select()
        .from(schema.semesters)
        .orderBy(desc(schema.semesters.createdAt));

      return jsonResponse(200, { semesters }, cacheHeaders);
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
