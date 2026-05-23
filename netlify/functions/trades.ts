import { desc, eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { formatZodError, tradeSchema, tradeUpdateSchema } from '../../db/validation';
import { validateToken } from './lib/auth';
import { corsResponse, jsonResponse, secureErrorResponse } from './lib/response';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  try {
    const user = await validateToken(event.headers.authorization);

    const { httpMethod, path, body } = event;
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
      let requestBody;
      try {
        requestBody = tradeSchema.parse(body ? JSON.parse(body) : {});
      } catch (e) {
        if (e instanceof ZodError) {
          return jsonResponse(400, formatZodError(e));
        }
        return jsonResponse(400, { error: 'Invalid JSON' });
      }

      const [userProfile] = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.auth0UserId, user.sub));

      if (!userProfile) {
        return jsonResponse(400, {
          error: 'Profile not found',
          message: 'Please complete onboarding before creating a trade',
        });
      }

      const [newTrade] = await db
        .insert(schema.trades)
        .values({
          auth0UserId: user.sub,
          userDisplayName: user.name,
          userEmail: user.email,
          userAvatarUrl: user.picture || null,
          courseCode: requestBody.courseCode,
          courseName: requestBody.courseName || null,
          sectionOffered: requestBody.sectionOffered,
          sectionWanted: requestBody.sectionWanted,
          status: 'open',
          description: requestBody.description || null,
          contactPhone: userProfile.phone,
        })
        .returning();

      return jsonResponse(201, { trade: newTrade });
    }

    if (httpMethod === 'PUT' && tradeId) {
      const idNum = parseInt(tradeId, 10);
      if (Number.isNaN(idNum)) {
        return jsonResponse(400, { error: 'Invalid trade ID' });
      }

      let requestBody;
      try {
        requestBody = tradeUpdateSchema.parse(body ? JSON.parse(body) : {});
      } catch (e) {
        if (e instanceof ZodError) {
          return jsonResponse(400, formatZodError(e));
        }
        return jsonResponse(400, { error: 'Invalid JSON' });
      }

      const [existingTrade] = await db
        .select()
        .from(schema.trades)
        .where(eq(schema.trades.id, idNum));

      if (!existingTrade) {
        return jsonResponse(404, { error: 'Trade not found' });
      }

      if (existingTrade.auth0UserId !== user.sub) {
        return jsonResponse(403, {
          error: 'Unauthorized: You can only edit your own trades',
        });
      }

      const [userProfile] = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.auth0UserId, user.sub));

      const [updatedTrade] = await db
        .update(schema.trades)
        .set({
          courseCode: requestBody.courseCode ?? existingTrade.courseCode,
          courseName: requestBody.courseName ?? existingTrade.courseName,
          sectionOffered: requestBody.sectionOffered ?? existingTrade.sectionOffered,
          sectionWanted: requestBody.sectionWanted ?? existingTrade.sectionWanted,
          status: requestBody.status ?? existingTrade.status,
          description: requestBody.description ?? existingTrade.description,
          contactPhone: userProfile?.phone ?? existingTrade.contactPhone,
          updatedAt: new Date(),
        })
        .where(eq(schema.trades.id, idNum))
        .returning();

      return jsonResponse(200, { trade: updatedTrade });
    }

    if (httpMethod === 'DELETE' && tradeId) {
      const idNum = parseInt(tradeId, 10);
      if (Number.isNaN(idNum)) {
        return jsonResponse(400, { error: 'Invalid trade ID' });
      }

      const [existingTrade] = await db
        .select()
        .from(schema.trades)
        .where(eq(schema.trades.id, idNum));

      if (!existingTrade) {
        return jsonResponse(404, { error: 'Trade not found' });
      }

      if (existingTrade.auth0UserId !== user.sub) {
        return jsonResponse(403, {
          error: 'Unauthorized: You can only delete your own trades',
        });
      }

      await db.delete(schema.trades).where(eq(schema.trades.id, idNum));

      return jsonResponse(200, { success: true });
    }

    return jsonResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('authorization')) {
      return jsonResponse(401, {
        error: 'Unauthorized',
        message: error.message,
      });
    }

    return secureErrorResponse(error);
  }
};
