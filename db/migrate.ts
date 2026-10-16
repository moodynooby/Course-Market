/**
 * Database Migration Runner
 *
 * Runs pending Drizzle migrations using the Neon HTTP driver.
 * Uses DATABASE_URL or NETLIFY_DATABASE_URL from the environment.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const databaseUrl = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;

if (!databaseUrl) {
  console.error(
    '[db:migrate] Error: DATABASE_URL or NETLIFY_DATABASE_URL is required to run migrations.',
  );
  process.exit(1);
  throw new Error('Database URL is required');
}

const migrationsFolder = resolve(process.cwd(), 'migrations');
const journalFile = resolve(migrationsFolder, 'meta', '_journal.json');

if (!existsSync(journalFile)) {
  console.log(
    '[db:migrate] No generated migrations found in ./migrations. Run "pnpm db:generate" first to generate SQL migrations, or use "pnpm db:push" for direct schema synchronization.',
  );
  process.exit(0);
}

async function runMigrations(url: string): Promise<void> {
  console.log('[db:migrate] Connecting to database and applying migrations...');
  const sql = neon(url);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder });
  console.log('[db:migrate] Migrations completed successfully.');
}

runMigrations(databaseUrl).catch((error) => {
  console.error('[db:migrate] Migration failed:', error);
  process.exit(1);
});
