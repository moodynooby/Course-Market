import { neon } from '@netlify/neon';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { optimizationCache } from '../../db/schema';
import { validateToken } from './lib/auth';

const client = neon();
const db = drizzle({ client, schema: { optimizationCache } });

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const user = await validateToken(event.headers.authorization);

    if (event.httpMethod === 'GET') {
      const cacheKey = event.queryStringParameters?.cacheKey;
      if (!cacheKey) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'cacheKey is required' }),
        };
      }

      const result = await db
        .select()
        .from(optimizationCache)
        .where(
          and(
            eq(optimizationCache.auth0UserId, user.sub),
            eq(optimizationCache.cacheKey, cacheKey),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Cache not found' }) };
      }

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(result[0]),
      };
    }

    if (event.httpMethod === 'POST') {
      const { cacheKey, analysis, actions } = JSON.parse(event.body || '{}');

      if (!cacheKey || !analysis) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'cacheKey and analysis are required' }),
        };
      }

      await db
        .insert(optimizationCache)
        .values({
          auth0UserId: user.sub,
          cacheKey,
          analysis,
          actions,
        })
        .onConflictDoUpdate({
          target: [optimizationCache.auth0UserId, optimizationCache.cacheKey],
          set: {
            analysis,
            actions,
            createdAt: new Date(),
          },
        });

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error: any) {
    console.error('Optimization Cache Error:', error);

    if (error instanceof Error && error.message.includes('authorization')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized', code: 'AUTH_ERROR' }),
      };
    }

    return {
      statusCode: error.status || 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
