import { neon } from '@netlify/neon';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { userLlmKeys } from '../../../db/schema';

const client = neon();
const db = drizzle({ client, schema: { userLlmKeys } });

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
      target: userLlmKeys.auth0UserId,
      set: {
        apiKey,
        provider,
        updatedAt: new Date(),
      },
    });
}

export async function deleteUserKey(auth0UserId: string): Promise<void> {
  await db.delete(userLlmKeys).where(eq(userLlmKeys.auth0UserId, auth0UserId));
}

export async function hasUserKey(auth0UserId: string, provider: string): Promise<boolean> {
  const result = await db
    .select()
    .from(userLlmKeys)
    .where(eq(userLlmKeys.auth0UserId, auth0UserId))
    .limit(1);

  return result.length > 0 && result[0].provider === provider;
}
