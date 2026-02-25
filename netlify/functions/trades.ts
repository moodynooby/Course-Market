
import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { validateToken } from './lib/auth';

const client = neon();
const db = drizzle({ client, schema });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(statusCode: number, body: object) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const user = await validateToken(event.headers.authorization);

    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};
    const pathParts = path.split('/').filter(Boolean);
    const tradeId = pathParts[pathParts.length - 1];

    if (httpMethod === 'GET' && path.endsWith('/trades')) {
      const allTrades = await db
        .select()
        .from(schema.trades)
        .orderBy(desc(schema.trades.createdAt));

      return jsonResponse(200, { trades: allTrades });
    }

    if (httpMethod === 'POST' && path.endsWith('/trades')) {
      const {
        courseCode,
        courseName,
        sectionOffered,
        sectionWanted,
        action,
        description,
        contactPhone,
      } = requestBody;

      if (!courseCode || !sectionOffered || !sectionWanted || !action || !contactPhone) {
        return jsonResponse(400, { error: 'Missing required fields' });
      }

      const [newTrade] = await db
        .insert(schema.trades)
        .values({
          auth0UserId: user.sub,
          userDisplayName: user.name,
          userEmail: user.email,
          userAvatarUrl: user.picture || null,
          courseCode,
          courseName: courseName || null,
          sectionOffered,
          sectionWanted,
          action,
          status: 'open',
          description: description || null,
          contactPhone,
        })
        .returning();

      return jsonResponse(201, { trade: newTrade });
    }

    if (httpMethod === 'PUT' && tradeId) {
      const {
        status,
        courseCode,
        courseName,
        sectionOffered,
        sectionWanted,
        action,
        description,
        contactPhone,
      } = requestBody;

      const [existingTrade] = await db
        .select()
        .from(schema.trades)
        .where(eq(schema.trades.id, parseInt(tradeId)));

      if (!existingTrade) {
        return jsonResponse(404, { error: 'Trade not found' });
      }

      if (existingTrade.auth0UserId !== user.sub) {
        return jsonResponse(403, {
          error: 'Unauthorized: You can only edit your own trades',
        });
      }

      const [updatedTrade] = await db
        .update(schema.trades)
        .set({
          courseCode: courseCode ?? existingTrade.courseCode,
          courseName: courseName ?? existingTrade.courseName,
          sectionOffered: sectionOffered ?? existingTrade.sectionOffered,
          sectionWanted: sectionWanted ?? existingTrade.sectionWanted,
          action: action ?? existingTrade.action,
          status: status ?? existingTrade.status,
          description: description ?? existingTrade.description,
          contactPhone: contactPhone ?? existingTrade.contactPhone,
          updatedAt: new Date(),
        })
        .where(eq(schema.trades.id, parseInt(tradeId)))
        .returning();

      return jsonResponse(200, { trade: updatedTrade });
    }

    if (httpMethod === 'DELETE' && tradeId) {
      const [existingTrade] = await db
        .select()
        .from(schema.trades)
        .where(eq(schema.trades.id, parseInt(tradeId)));

      if (!existingTrade) {
        return jsonResponse(404, { error: 'Trade not found' });
      }

      if (existingTrade.auth0UserId !== user.sub) {
        return jsonResponse(403, {
          error: 'Unauthorized: You can only delete your own trades',
        });
      }

      await db.delete(schema.trades).where(eq(schema.trades.id, parseInt(tradeId)));

      return jsonResponse(200, { success: true });
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
