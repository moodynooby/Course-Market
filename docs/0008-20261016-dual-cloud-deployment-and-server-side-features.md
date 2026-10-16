# Dual Cloud Deployment and Server-Side Features

- Status: complete
- Owners: Architecture, Web Platform, Backend
- Last Updated: 2026-10-16
- Related Files: `api/_adapter.ts`, `api/[...path].ts`, `netlify/functions/schedules.ts`, `netlify/functions/courses.ts`, `src/services/apiClient.ts`, `src/services/schedulesApi.ts`, `src/services/coursesApi.ts`, `src/hooks/useScheduleGeneration.ts`, `vercel.json`, `netlify.toml`

## Context & Motivation

AuraIsHub was previously tightly coupled to Netlify's execution environment and client-side processing:

1. Heavy combinatorial schedule generation ran directly on the client thread, causing UI freezes on lower-end devices.
2. Course filtering and search was entirely client-side, requiring the entire semester catalog to be downloaded into browser memory.
3. API endpoints were hardcoded to Netlify's proprietary `/.netlify/functions/*` paths, preventing deployment to Vercel, Node.js, or Docker containers.

## Architectural Changes

### 1. Dual Deployment Support (Vercel + Netlify)

- **Standardized API Base URL**: Changed `apiClient.ts` to route requests through `/api/*` instead of `/.netlify/functions/*`.
- **Universal Node/Serverless Adapter**: Implemented `api/_adapter.ts` which transforms Node.js HTTP `IncomingMessage` and `ServerResponse` into the standard event representation consumed by the core handlers.
- **Vercel Catch-All Router**: Implemented `api/[...path].ts` and individual endpoints in `api/` along with `vercel.json` rewrites and security headers.
- **Netlify Rewrite Configuration**: Added `[[redirects]] from = "/api/*" to = "/.netlify/functions/:splat"` in `netlify.toml`.
- **Local Vite Dev Middleware**: Added `apiDevRewritePlugin` to `vite.config.ts` so developers can run `pnpm run dev` with seamless API proxying without vendor CLI wrappers.

### 2. Server-Side Schedule Generation & Optimization

- **Endpoint**: `POST /api/schedules/generate` (`netlify/functions/schedules.ts` / `api/schedules.ts`).
- **Input Validation**: Uses `scheduleGenerateSchema` in `db/validation.ts` to validate courses, sections, pinned selections, preferences, and generation limits.
- **Computation**: Executes section prefiltering, combinatorial backtracking, scoring, and empty-generation diagnostics on the server.
- **Client Resilience**: `src/hooks/useScheduleGeneration.ts` attempts to execute on the server via `generateSchedulesApi`, falling back smoothly to local in-browser computation if the network request fails or the user is offline.

### 3. Server-Side Course Search & Filtering

- **Endpoint**: `GET /api/courses/search` (`netlify/functions/courses.ts` / `api/courses.ts`).
- **Capabilities**: Supports `semesterId`, search query `q` (case-insensitive substring across course code, name, description, and instructor names), `subject` filter, `openSeatsOnly`, and pagination (`limit`, `offset`).
- **Client Service**: Added `searchCoursesApi` in `src/services/coursesApi.ts`.

## Verification

- **Biome Linter & Formatter**: 135 files checked, 0 errors, 0 warnings.
- **Markdownlint & ShellCheck**: Passed.
- **TypeScript Typecheck**: Passed with 0 errors across `tsconfig.app.json`, `tsconfig.node.json`, and `tsconfig.netlify.json`.
- **Unit Tests**: 18 test files, 158 tests passed.
- **Production Build**: `pnpm run build` completed cleanly in 3.04s.
