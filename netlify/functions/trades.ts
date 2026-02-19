// Netlify Function for Course Trading Board
// Uses @netlify/neon (auto-reads NETLIFY_DATABASE_URL) + Drizzle ORM

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';

function getDb() {
  const client = neon();
  return drizzle({ client, schema });
}

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

exports.handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const db = getDb();
    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};

    // GET /trades
    if (httpMethod === 'GET' && path.endsWith('/trades')) {
      const allTrades = await db
        .select()
        .from(schema.trades)
        .orderBy(desc(schema.trades.createdAt));

      return jsonResponse(200, { trades: allTrades });
    }

    // POST /trades
    if (httpMethod === 'POST' && path.endsWith('/trades')) {
      const { action, trade, user } = requestBody;

      if (action === 'createUser' && user) {
        const [newUser] = await db
          .insert(schema.users)
          .values({
            email: user.email || `${user.id}@placeholder.local`,
            displayName: user.displayName,
            provider: 'email',
          })
          .onConflictDoUpdate({
            target: schema.users.email,
            set: { displayName: user.displayName, updatedAt: new Date() },
          })
          .returning();

        return jsonResponse(201, { user: newUser });
      }

      if (action === 'createTrade' && trade) {
        const [newTrade] = await db
          .insert(schema.trades)
          .values({
            userId: trade.userId,
            courseCode: trade.courseCode,
            courseName: trade.courseName || null,
            sectionOffered: trade.sectionOffered,
            sectionWanted: trade.sectionWanted,
            action: trade.action,
            status: trade.status || 'open',
            description: trade.description || null,
            contactPhone: trade.contactPhone || null,
          })
          .returning();

        return jsonResponse(201, { trade: newTrade });
      }

      return jsonResponse(400, { error: 'Invalid request' });
    }

    // PUT /trades
    if (httpMethod === 'PUT' && path.endsWith('/trades')) {
      const { action, tradeId, status } = requestBody;

      if (action === 'updateTrade' && tradeId && status) {
        const [updatedTrade] = await db
          .update(schema.trades)
          .set({ status, updatedAt: new Date() })
          .where(eq(schema.trades.id, tradeId))
          .returning();

        if (updatedTrade) {
          return jsonResponse(200, { trade: updatedTrade });
        }
        return jsonResponse(404, { error: 'Trade not found' });
      }

      return jsonResponse(400, { error: 'Invalid request' });
    }

    // DELETE /trades
    if (httpMethod === 'DELETE' && path.endsWith('/trades')) {
      const { action, tradeId } = requestBody;

      if (action === 'deleteTrade' && tradeId) {
        const [deleted] = await db
          .delete(schema.trades)
          .where(eq(schema.trades.id, tradeId))
          .returning();

        return jsonResponse(deleted ? 200 : 404, {
          success: !!deleted,
          error: deleted ? null : 'Trade not found',
        });
      }

      return jsonResponse(400, { error: 'Invalid request' });
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
