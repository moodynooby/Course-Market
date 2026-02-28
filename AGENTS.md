# AGENTS.md - Quick Start & Guidelines

## Project Overview

- **Stack**: React 19 + Vite + TypeScript + MUI (Emotion)
- **Backend**: Netlify Functions + Drizzle ORM + Neon PostgreSQL (via Netlify addon)
- **Auth**: Auth0 (SPA SDK on frontend, `jose` JWT validation on backend)
- **Goal**: Course marketplace for trading sections based on Auth0 identity

## Commands
```bash
bun run dev  # Vite + Netlify Backend
bun run build # Build + SPA _redirects generation
bun run ci    # Fix + Test + TSC check
```

## Code Standards

- **Linter**: Biome (single quotes, 100 char line length, 2 space indent)
- **Naming**: PascalCase for components, camelCase for functions/variables, kebab-case for files
- **State**: Use `useAuth` hook (src/hooks/useAuth.ts) for identity, local state for UI
- **Styles**: MUI `sx` prop + theme tokens, custom hooks for complex logic
- **Routing**: Protected routes use `<ProtectedRoute>` wrapper

## Architecture

### Database & Backend

- **Schema**: `db/schema.ts` - Currently only `trades` table
- **Identity**: Track users via `auth0UserId` (Auth0 `sub` claim), no local users table
- **Functions**: `netlify/functions/*.ts` - Use `export const handler` (ESM format)
- **Database Access**: `@netlify/neon` package with `neon()` - DATABASE_URL auto-injected by addon
- **Migrations**: NEVER edit SQL manually - use `bun run db:generate` then `bun run db:migrate`

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
4. **Run migrations**: `bun run db:migrate`
5. **Start dev server**: `bun run dev`

### Routing & Deployment

- **SPA Routing**: `_redirects` file generated in `dist/` at build time
- **Protected routes**: Use `<ProtectedRoute>` component for auth-required pages

## Testing

- **Framework**: Vitest + Testing Library
- **Strategy**: Test core logic (csv, schedule utils), async states, error boundaries
- **Run**: `bun run test` (watch) or `bun run test:run` (CI)
- **Coverage**: Focus on business logic, not UI snapshots

## Critical Rules for Agents

1. **Always use `bun run dev`** for full stack development (not `dev:vite`)
   - Reason: Vite plugin handles both frontend and Netlify Functions

2. **Never edit migrations manually**
   - Use `bun run db:generate` after schema changes
   - Then `bun run db:migrate` to apply

3. **Identity is Auth0-based**
   - Track users via `auth0UserId` (sub claim)
   - No local users table
   - All API calls require Bearer token in Authorization header

4. **Run `bun run fix` before commits**
   - Auto-fixes linting and formatting issues
   - Biome is configured, don't fight it

5. **Environment variables are in .env only**
   - Frontend: VITE_ prefix
   - Backend: No prefix
   - Vite plugin loads both from .env file
   - No need for Netlify env vars with Vite plugin

6. **Database connection is automatic**
   - `neon()` with no args reads DATABASE_URL from environment
   - Netlify addon injects this automatically
   - Must run `netlify link` first for local dev

7. **Update this file after architectural changes**
   - Keep it current for future agents and developers


## File Structure

```
src/
├── components/       # React components
├── hooks/           # Custom hooks (useAuth, etc.)
├── pages/           # Route pages
├── services/        # API clients (tradesApi, llm)
├── utils/           # Pure functions (csv, schedule)
├── types/           # TypeScript definitions
└── config/          # App configuration

netlify/functions/   # Serverless functions
db/                  # Database schema + helpers
migrations/          # Drizzle migrations (auto-generated)
```

## Useful Links

- [README](./README.md) - Full project documentation
- [Netlify Neon Addon](https://docs.netlify.com/integrations/neon/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Auth0 SPA SDK](https://auth0.com/docs/libraries/auth0-react)
