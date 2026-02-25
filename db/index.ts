import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const client = neon();

export const db = drizzle({
  schema,
  client,
});

export async function createTrade(data: schema.NewTrade) {
  const [result] = await db.insert(schema.trades).values(data).returning();
  return result;
}

export async function getAllTrades() {
  return await db.query.trades.findMany({
    orderBy: (trades, { desc }) => desc(trades.createdAt),
  });
}

export async function getTradeById(id: number) {
  return await db.query.trades.findFirst({
    where: (trades, { eq }) => eq(trades.id, id),
  });
}

export async function updateTrade(id: number, data: Partial<schema.NewTrade>) {
  const [result] = await db
    .update(schema.trades)
    .set({ ...data, updatedAt: new Date() })
    .where((trades, { eq }) => eq(trades.id, id))
    .returning();
  return result;
}

export async function deleteTrade(id: number) {
  await db.delete(schema.trades).where((trades, { eq }) => eq(trades.id, id));
}

export async function getTradesByUser(auth0UserId: string) {
  return await db.query.trades.findMany({
    where: (trades, { eq }) => eq(trades.auth0UserId, auth0UserId),
    orderBy: (trades, { desc }) => desc(trades.createdAt),
  });
}
