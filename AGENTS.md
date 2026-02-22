# AGENTS.md - Quick Start & Guidelines

## Project Overview
- **Stack**: React (Vite) + TypeScript + MUI (Emotion).
- **Backend**: Netlify Functions + Drizzle ORM (Neon Postgres).
- **Auth**: Auth0 (SPA SDK on frontend, `jose` on backend).
- **Goal**: Marketplace for trading course sections based on Auth0 identity.

## Commands
```bash
bun start    # Local Dev (Netlify Proxy :8888 -> Vite :3000)
bun run dev  # Vite only (no functions auth)
bun run build # Build + SPA _redirects generation
bun run ci    # Fix + Test + TSC check
```

## Standards & Patterns
- **Style**: Biome (single quotes, 100 char, 2 space). Run `bun run fix`.
- **Naming**: PascalCase Components, camelCase logic, kebab-case files.
- **State**: `useAuth` (src/hooks/useAuth.ts) for identity. Local state for UI.
- **Styles**: MUI `sx` prop + theme tokens. Use custom hooks for complex logic.
- **Routing**: Protected routes use `ProtectedRoute`.

## Database & Netlify Functions
- **Schema**: `db/schema.ts` (Trades only). Identity via `auth0UserId` (sub claim).
- **Functions**: `netlify/functions/`. Use `export const handler` (ESM).
- **Local Env**: Backend falls back to `VITE_` variables for local Auth0 validation.
- **SPA Routing**: `_redirects` generated in `dist` at build time. No global redirects in `netlify.toml`.

## Testing
- **Framework**: Vitest + Testing Library.
- **Strategy**: Test core logic (`csv`, `schedule`), async states, and error limits.
- **Execution**: `bun run test` (watch) or `bun run test:run` (CI).

## Agent Rules
1. **Dev Proxy**: Always use `bun start` to ensure environment variables are present.
2. **Migrations**: Never edit manually; use `db:generate` and `db:migrate` (via `npx netlify`).
3. **Identity**: Track users via `auth0UserId`, not local IDs. No local `users` table.
4. **Auth Header**: All API calls must include Bearer token.
5. **Update Doc**: Keep this file updated after architectural changes.
6. **Linting**: Run `bun run fix` before every commit.
