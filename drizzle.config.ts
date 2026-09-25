import type { Config } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL is required for Drizzle commands.');
}

export default {
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: databaseUrl,
  },
  /**
   * Never edit the migrations directly, only use drizzle.
   * There are scripts in the package.json to handle this.
   */
  verbose: true,
  strict: false,
} satisfies Config;
