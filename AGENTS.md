# AGENTS.md - Quick Start & Guidelines

## Architecture

### Database & Backend

- **Schema**: `db/schema.ts` - Tables: `trades`, `user_profiles`, `user_llm_keys`, `semesters`
- **Identity**: Track users via `auth0UserId` (Auth0 `sub` claim), no local users table
- **Functions**: `netlify/functions/*.ts` - Use `export const handler` (ESM format)
- **Database Access**: `@netlify/neon` package with `neon()` - DATABASE_URL auto-injected by addon
- **Schema Sync**: Use `pnpm run db:push` to sync schema (uses drizzle-kit push, not migrations)

### Course Data Architecture (JSON-First)

- **Data Source**: JSON files in `/public/semesters/` (e.g., `Winter2025.json`)
- **Backend API**: `netlify/functions/semesters.ts` - Reads JSON files, returns semester metadata
- **Frontend Flow**:
  1. Fetch `/semesters` API → Get list of semesters with JSON URLs
  2. Fetch JSON directly from CDN (`/semesters/*.json`)
  3. Parse and transform data client-side
  4. Cache in localStorage with 24-hour TTL
- **Caching**: localStorage with version tracking and timestamp-based invalidation
- **Benefits**: Single source of truth, faster initial load, no database sync issues

### Database Tables

- `trades` - Trade posts for course section swapping
- `user_profiles` - User profile data with onboarding status
- `user_llm_keys` - User-provided LLM API keys
- `semesters` - Semester metadata (id, name, jsonUrl, isActive)

**Note**: Course and section data is stored in JSON files, NOT in database tables (removed: `courses`, `sections`, `time_slots`)

### Critical Rules

1. **Use `useAuthContext()`** in components needing auth or profile data
2. **Don't call profile API directly** - use context's `updateProfile()` and `refreshProfile()`
3. **Profile is cached** in context - avoid redundant fetches
4. RUN pre-commit before thing task ic completer
5. IF you add or modify the arhcitecture make sure to update the testes too

## Critical Rules for Agents

1. **Always use `pnpm run dev`** for full stack development (not `dev:vite`)
   - Reason: Vite plugin handles both frontend and Netlify Functions

2. **Course data is JSON-based**
   - Course/section data lives in `/public/semesters/*.json`
   - No database tables for courses/sections
   - Frontend fetches JSON directly from CDN
   - Cache invalidation: 24-hour TTL in localStorage

3. **Identity is Auth0-based**
   - Track users via `auth0UserId` (sub claim)
   - No local users table (except user_profiles for onboarding)
   - All API calls require Bearer token in Authorization header

4. **Environment variables are in .env only**
   - Frontend: VITE_ prefix
   - Backend: No prefix
   - Vite plugin loads both from .env file
   - No need for Netlify env vars with Vite plugin

5. **Database connection is automatic**
   - `neon()` with no args reads DATABASE_URL from environment
   - Netlify addon injects this automatically
   - Must run `netlify link` first for local dev

6. **Update this file after architectural changes**
   - Keep it current for future agents and developers

## File Structure

```
src/
├── components/       # React components
├── hooks/           # Custom hooks (useAuth, etc.)
├── pages/           # Route pages
├── services/        # API clients (tradesApi, llm)
├── utils/           # Pure functions 
├── types/           # TypeScript definitions
└── config/          # App configuration

netlify/functions/   # Serverless functions
db/                  # Database schema + helpers
```
