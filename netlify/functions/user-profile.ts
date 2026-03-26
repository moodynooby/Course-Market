import { neon } from '@netlify/neon';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { ZodError } from 'zod';
import * as schema from '../../db/schema';
import { formatZodError, userProfileSchema, userProfileUpdateSchema } from '../../src/lib/schemas';
import { validateToken } from './lib/auth';

const client = neon();
const db = drizzle({ client, schema });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(statusCode: number, body: object, headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers: { ...corsHeaders, ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const user = await validateToken(event.headers.authorization);

    const { httpMethod, body } = event;

    // GET: Fetch user profile
    if (httpMethod === 'GET') {
      const [profile] = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.auth0UserId, user.sub));

      if (!profile) {
        return jsonResponse(404, { error: 'Profile not found' });
      }

      return jsonResponse(200, { profile });
    }

    // POST: Create or update user profile
    if (httpMethod === 'POST') {
      const [existingProfile] = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.auth0UserId, user.sub));

      let requestBody;
      try {
        const schemaToUse = existingProfile ? userProfileUpdateSchema : userProfileSchema;
        requestBody = schemaToUse.parse(body ? JSON.parse(body) : {});
      } catch (e) {
        if (e instanceof ZodError) {
          return jsonResponse(400, formatZodError(e));
        }
        return jsonResponse(400, { error: 'Invalid JSON' });
      }

      let profile;

      if (existingProfile) {
        // Update existing profile - only update provided fields
        [profile] = await db
          .update(schema.userProfiles)
          .set({
            displayName: requestBody.displayName ?? existingProfile.displayName,
            email: requestBody.email ?? existingProfile.email,
            phone: requestBody.phone ?? existingProfile.phone,
            semesterId: requestBody.semesterId ?? existingProfile.semesterId,
            preferences: requestBody.preferences ?? existingProfile.preferences,
            onboardingCompleted:
              requestBody.onboardingCompleted ?? existingProfile.onboardingCompleted,
            updatedAt: new Date(),
          })
          .where(eq(schema.userProfiles.auth0UserId, user.sub))
          .returning();
      } else {
        // Create new profile - all required fields must be present
        [profile] = await db
          .insert(schema.userProfiles)
          .values({
            auth0UserId: user.sub,
            displayName: requestBody.displayName,
            email: requestBody.email,
            phone: requestBody.phone,
            semesterId: requestBody.semesterId || null,
            preferences: requestBody.preferences || null,
            onboardingCompleted: requestBody.onboardingCompleted ?? false,
          })
          .returning();
      }

      return jsonResponse(200, { profile });
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
