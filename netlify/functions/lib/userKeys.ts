import { and, eq } from 'drizzle-orm';
import { db } from '../../../db';
import { userLlmKeys } from '../../../db/schema';

/**
 * Retrieves the API key for a specific user and provider.
 * Uses explicit column selection for data minimization and filters by both
 * auth0UserId and provider at the database level for correct authorization.
 */
export async function getUserKey(auth0UserId: string, provider: string): Promise<string | null> {
  const [result] = await db
    .select({ apiKey: userLlmKeys.apiKey })
    .from(userLlmKeys)
    .where(and(eq(userLlmKeys.auth0UserId, auth0UserId), eq(userLlmKeys.provider, provider)))
    .limit(1);

  return result?.apiKey ?? null;
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
