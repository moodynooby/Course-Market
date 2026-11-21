/**
 * Neon sets NETLIFY_DATABASE_URL on Netlify; local scripts and Vercel use
 * DATABASE_URL. Both resolve to the same database.
 */
export function readDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
}
