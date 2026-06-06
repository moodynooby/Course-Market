import { and, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { userLlmKeys } from '../../../db/schema';

export async function getUserKey(auth0UserId: string, provider: string): Promise<string | null> {
  // Use explicit selection to follow the principle of data minimization (PII protection)
  // and filter by both user and provider at the database level to ensure correct retrieval.
  const result = await db
    .select({ apiKey: userLlmKeys.apiKey })
    .from(userLlmKeys)
    .where(and(eq(userLlmKeys.auth0UserId, auth0UserId), eq(userLlmKeys.provider, provider)))
    .limit(1);

  if (result.length === 0) {
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
