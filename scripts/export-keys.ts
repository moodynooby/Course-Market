#!/usr/bin/env bun
import { neon } from '@netlify/neon';
import { desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { userLlmKeys } from '../db/schema';

const client = neon();
const db = drizzle({ client, schema });

async function exportKeys() {
  console.log('Fetching all user LLM keys...\n');

  try {
    const keys = await db.select().from(userLlmKeys).orderBy(desc(userLlmKeys.createdAt));

    if (keys.length === 0) {
      console.log('No user LLM keys found in the database.');
      return;
    }

    console.log(`Found ${keys.length} user key(s).\n`);
    console.log(
      '┌──────────────────────────────────────┬──────────┬────────────┬──────────────────────────────────────┐',
    );
    console.log(
      '│ auth0_user_id                       │ provider │ key_length│ created_at                           │',
    );
    console.log(
      '├──────────────────────────────────────┼──────────┼────────────┼──────────────────────────────────────┤',
    );

    for (const key of keys) {
      const createdAt = key.createdAt?.toISOString().slice(0, 19).replace('T', ' ') || 'N/A';
      const userId = key.auth0UserId.slice(0, 34).padEnd(34);
      const provider = key.provider.padEnd(10);
      const keyLength = key.encryptedKey.length.toString().padEnd(10);

      console.log(`│ ${userId} │ ${provider} │ ${keyLength} │ ${createdAt} │`);
    }

    console.log(
      '└──────────────────────────────────────┴──────────┴────────────┴──────────────────────────────────────┘\n',
    );

    console.log('Summary by provider:');
    const byProvider = keys.reduce(
      (acc, key) => {
        acc[key.provider] = (acc[key.provider] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const [provider, count] of Object.entries(byProvider)) {
      console.log(`  ${provider}: ${count} key(s)`);
    }

    console.log('\n⚠️  Note: Keys are encrypted with AES-256-GCM. To decrypt them, you need:');
    console.log('   1. LLM_ENCRYPTION_KEY environment variable set');
    console.log('   2. Access to the server-side decryption function\n');
  } catch (error) {
    console.error('Error fetching keys:', error);
    process.exit(1);
  }
}

exportKeys();
