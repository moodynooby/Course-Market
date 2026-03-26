# AGENTS.md - Quick Start & Guidelines

## Project Overview

- **Stack**: React 19 + Vite + TypeScript + MUI (Emotion)
- **Backend**: Netlify Functions + Drizzle ORM + Neon PostgreSQL (via Netlify addon)
- **Auth**: Auth0 (SPA SDK on frontend, `jose` JWT validation on backend)
- **Goal**: Course marketplace for trading sections based on Auth0 identity

## Commands

```bash
pnpm run dev  # Vite + Netlify Backend
pnpm run build # Build + SPA _redirects generation
```

## Code Standards

- **Linter**: Biome (single quotes, 100 char line length, 2 space indent)
- **Naming**: PascalCase for components, camelCase for functions/variables, kebab-case for files
- **State**: Use `useAuth` hook (src/hooks/useAuth.ts) for identity, local state for UI
- **Styles**: MUI `sx` prop + theme tokens, custom hooks for complex logic
- **Routing**: Protected routes use `<ProtectedRoute>` wrapper

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

### Environment Variables

**Frontend** (browser access requires VITE_ prefix):

- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`

**Backend** (Netlify Functions, reads from .env file):

- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `DATABASE_URL` (auto-injected by Neon addon)

**Important**: All environment variables should be set in your local `.env` file. The Netlify Vite plugin loads them automatically.

### Local Development Setup

1. **Link to Netlify**: `netlify link` (REQUIRED for DATABASE_URL)
2. **Install Neon addon**: `netlify addons:create neon` (if not already installed)
3. **Configure .env**: Copy `.env.example` and fill in Auth0 credentials
4. **Push schema**: `pnpm run db:push`
5. **Start dev server**: `pnpm run dev`

### Routing & Deployment

- **SPA Routing**: `_redirects` file generated in `dist/` at build time
- **Protected routes**: Use `<ProtectedRoute>` component for auth-required pages

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

## Useful Links

- [README](./README.md) - Full project documentation
- [Netlify Neon Addon](https://docs.netlify.com/integrations/neon/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Auth0 SPA SDK](https://auth0.com/docs/libraries/auth0-react)
