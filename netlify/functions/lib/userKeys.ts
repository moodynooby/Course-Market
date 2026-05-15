import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { userLlmKeys } from '../../../db/schema';

export async function getUserKey(auth0UserId: string, provider: string): Promise<string | null> {
  const result = await db
    .select()
    .from(userLlmKeys)
    .where(eq(userLlmKeys.auth0UserId, auth0UserId))
    .limit(1);

  if (result.length === 0 || result[0].provider !== provider) {
    return null;
  }

  return result[0].apiKey;
}

export async function saveUserKey(
  auth0UserId: string,
  provider: string,
  apiKey: string,
): Promise<void> {
  await db
    .insert(userLlmKeys)
    .values({
      auth0UserId,
      provider,
      apiKey,
    })
    .onConflictDoUpdate({
      target: [userLlmKeys.auth0UserId, userLlmKeys.provider],
      set: {
        apiKey,
        updatedAt: new Date(),
      },
    });
}
