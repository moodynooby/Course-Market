# AGENTS.md

## Dev Server

Run `pnpm run dev` — this starts `netlify dev` which serves the app on port **3000** (Vite runs internally on 5173). Not `pnpm run dev:vite` or `vite` directly. The Netlify Vite plugin loads `.env` variables and runs Netlify Functions locally.

## Build & Typecheck

`pnpm run build` = `tsc -b && vite build && echo '/* /index.html 200' > dist/_redirects`. The `tsc -b` is a multi-project build across three tsconfigs: `tsconfig.app.json` (src), `tsconfig.netlify.json` (db + netlify/functions), `tsconfig.node.json` (vite.config). `pnpm run typecheck` runs `tsc -b` without emitting.

## Database

Schema lives in `db/schema.ts`. Sync changes with `pnpm run db:push` (drizzle-kit push, not db:migrate). The database is Neon Postgres — `neon()` with no arguments reads `DATABASE_URL` from the environment, which is auto-injected by the Netlify Neon addon. Requires `netlify link` for local dev.

## Auth & Profile

Auth0 is the identity layer. Every API call needs a `Bearer` token in the Authorization header. Use `useAuthContext()` for auth state and profile — never call `/user-profile` directly. Use `useConfigContext()` for preferences and LLM config (auto-syncs to localStorage and server profile).

## Course Data

Course/section data is JSON-first. Files live in `/public/semesters/*.json` and are fetched from the CDN, parsed client-side via **Web Worker** (`semesterParser.worker.ts`), and cached in **IndexedDB** (24h TTL via `idb` library). There are no `courses` or `sections` tables in the database. Semester metadata (which JSON to fetch) comes from the `semesters` DB table via the `/semesters` API.

## Code Conventions

Path aliases (from vite config): `@/`, `@components/`, `@pages/`, `@context/`, `@hooks/`, `@utils/`, `@types/`, `@services/`, `@assets/`. Biome rules: single quotes, trailing commas, semicolons always, 2-space indent, 100 line width, a11y off. React Compiler is enabled via `babel-plugin-react-compiler`. React 19, MUI v9, react-router v7, Emotion for styling.

## Testing

Vitest with `happy-dom` environment and globals enabled (`describe`/`it`/`expect` available without import). Test files live alongside source: `src/**/*.{test,spec}.{ts,tsx}`, `netlify/**/*.{test,spec}.{ts,tsx}`, `db/**/*.{test,spec}.{ts,tsx}`. Tests with `.slow.test.ts` suffix are excluded from `pnpm run test:fast` but included in `pnpm run test`. Auth0 is mocked globally in `src/test/setup.ts`.

## Pre-commit Pipeline

Lefthook runs `lint:staged` + `typecheck` + `test:fast` in parallel on pre-commit. To run them sequentially (as CI would), use `pnpm run pre-commit`. Pre-push runs full `test` and `lint`.

## Netlify Functions

Backend functions in `netlify/functions/*.ts` use `export const handler` in ESM format. Authentication uses `jose` (JWKS via createRemoteJWKSet) to validate Auth0 tokens — shared helpers in `netlify/functions/lib/auth.ts`. CORS and JSON response helpers in `netlify/functions/lib/response.ts`.
