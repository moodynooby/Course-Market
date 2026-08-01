import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '../../db';
import * as schema from '../../db/schema';
import type { UserProfileInput, UserProfileUpdateInput } from '../../db/validation';
import { formatZodError, userProfileSchema, userProfileUpdateSchema } from '../../db/validation';
import { jsonResponse } from './lib/response';
import { withAuth } from './lib/wrap';

const profileSelection = {
  auth0UserId: schema.userProfiles.auth0UserId,
  phone: schema.userProfiles.phone,
  semesterId: schema.userProfiles.semesterId,
  preferences: schema.userProfiles.preferences,
  courseSelections: schema.userProfiles.courseSelections,
  pinnedSelections: schema.userProfiles.pinnedSelections,
  llmConfig: schema.userProfiles.llmConfig,
  createdAt: schema.userProfiles.createdAt,
  updatedAt: schema.userProfiles.updatedAt,
} as const;

export const handler = withAuth(async (event, user) => {
  const { httpMethod, body } = event;

  if (httpMethod === 'GET') {
    const [profile] = await db
      .select(profileSelection)
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.auth0UserId, user.sub));

    if (!profile) {
      return jsonResponse(404, { error: 'Profile not found' });
    }

    return jsonResponse(200, { profile });
  }

  if (httpMethod === 'POST') {
    const [existingProfile] = await db
      .select(profileSelection)
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
        .returning(profileSelection);
    } else {
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
        .returning(profileSelection);
    }

    return jsonResponse(existingProfile ? 200 : 201, { profile });
  }

  return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
});
