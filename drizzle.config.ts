import type { Config } from 'drizzle-kit';

export default {
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL!,
  },
  /**
   * Never edit the migrations directly, only use drizzle.
   * There are scripts in the package.json to handle this.
   */
  verbose: true,
  strict: false,
} satisfies Config;
