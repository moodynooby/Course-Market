import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { readDatabaseUrl } from './env';
import * as schema from './schema';

const databaseUrl = readDatabaseUrl();

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL or NETLIFY_DATABASE_URL is required to initialize the database client.',
  );
}

const client = neon(databaseUrl);

export const db = drizzle({
  schema,
  client,
});
