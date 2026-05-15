import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '../../db';
import * as schema from '../../db/schema';
import type { UserProfileInput, UserProfileUpdateInput } from '../../db/validation';
import { formatZodError, userProfileSchema, userProfileUpdateSchema } from '../../db/validation';
import { validateToken } from './lib/auth';
import { corsResponse, jsonResponse } from './lib/response';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
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
        const input = requestBody as UserProfileUpdateInput;
        [profile] = await db
          .update(schema.userProfiles)
          .set({
            phone: input.phone ?? existingProfile.phone,
            semesterId: input.semesterId ?? existingProfile.semesterId,
            preferences: input.preferences ?? existingProfile.preferences,
            courseSelections: input.courseSelections ?? existingProfile.courseSelections,
            pinnedSelections: input.pinnedSelections ?? existingProfile.pinnedSelections,
            llmConfig: input.llmConfig ?? existingProfile.llmConfig,
            updatedAt: new Date(),
          })
          .where(eq(schema.userProfiles.auth0UserId, user.sub))
          .returning();
      } else {
        // Create new profile - all required fields must be present
        const input = requestBody as UserProfileInput;
        [profile] = await db
          .insert(schema.userProfiles)
          .values({
            auth0UserId: user.sub,
            phone: input.phone,
            semesterId: input.semesterId || null,
            preferences: input.preferences || null,
            courseSelections: input.courseSelections || null,
            pinnedSelections: input.pinnedSelections || null,
            llmConfig: input.llmConfig || null,
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
