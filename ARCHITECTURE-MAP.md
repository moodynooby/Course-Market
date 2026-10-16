# Architecture Map

Last updated: 2026-10-16

## System Overview

AuraIsHub is a React application with a PostgreSQL/Drizzle data layer and portable serverless/edge APIs.

```text
src/pages and src/components
        ↓
src/context and src/hooks
        ↓
src/services and src/utils
        ↓
Server API functions
        ↓
PostgreSQL / Auth0
```

## Domain Ownership

| Area                  | Primary location                     | Responsibility                                                           |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| Application shell     | `src/main.tsx`, `src/App.tsx`        | Providers, routing, application startup                                  |
| Pages                 | `src/pages/`                         | Route-level composition and page workflows                               |
| UI components         | `src/components/`                    | Reusable presentation and feature UI                                     |
| Global state          | `src/context/`                       | Authentication, configuration, theme, and notifications                  |
| Feature orchestration | `src/hooks/`                         | Course selection, semester loading, preferences, schedule generation     |
| Client boundaries     | `src/services/`                      | HTTP requests, caching, and search indexes                               |
| Pure domain logic     | `src/utils/`                         | Schedule generation, scoring, conflicts, calendar export, storage        |
| Server functions      | `netlify/functions/`, `api/`         | Authenticated HTTP handlers, Vercel/Netlify adapters, response contracts |
| Persistence           | `db/`                                | Drizzle schema, validation, seed data                                    |
| Verification          | `src/**/__tests__/`, `db/__tests__/` | Owner-boundary behavior tests                                            |

## Dependency Direction

1. Pages and components may import contexts, hooks, services, utilities, and types.
2. Hooks may import contexts, services, utilities, and types.
3. Services must not import React components or pages.
4. Pure utilities must not import React contexts, server functions, or database modules.
5. Server functions validate authentication and input before calling `db/`.

## Schedule Pipeline

```text
course selections
  → buildSectionsByCourse
  → prefilterSections
  → generateSchedules
  → score and conflict metadata
  → optional clustering/search
  → dashboard explorer
```

The ordering, score, section membership, progress callbacks, and conflict metadata of generated schedules are user-visible behavior. Refactors must preserve them.

## Hot Spots

- `src/components/CalendarView.tsx` — calendar orchestration, event interaction, sharing, and image capture.
- `src/components/schedule-explorer/ScheduleExplorerDialog.tsx` — schedule search, grouping, selection, and dialog orchestration.
- `src/pages/TradingPage.tsx` — trade list, form, editing, validation, and status actions.
- `src/pages/CoursesPage.tsx` — course browsing, filtering, selection, and semester loading.
- `src/utils/schedule.ts` — calendar projection, conflicts, features, and scoring.
- `src/utils/schedule-generator.ts` — generation, deduplication, clustering, and labels.
- `src/hooks/useScheduleGeneration.ts` — generation and explorer state/actions.
- `netlify/functions/schedules.ts`, `api/schedules.ts` — server-side combinatorial schedule generation & optimization.
- `netlify/functions/courses.ts`, `api/courses.ts` — server-side course search, filtering, and pagination.
- `api/_adapter.ts`, `api/[...path].ts` — universal Node/Vercel serverless request adapter.

Split these files only along independently testable responsibilities.

## Anti-Regression Contracts

- **Dual platform compatibility:** all API endpoints must execute identically on Vercel (via `api/` adapter) and Netlify (via `netlify/functions/`), sharing identical validation, error handling, and response shapes.
- **Schedule output:** preserve deterministic ordering, score ordering, section membership, conflicts, and progress behavior unless a product change explicitly requires otherwise.
- **Server responses:** preserve public serverless response shapes and status codes.
- **Privacy:** select explicit database columns in both `select()` and `returning()`; never expose newly added columns implicitly.
- **Authentication:** keep authentication and authorization checks at the server boundary; client guards are not security controls.
- **Persistence:** use `src/utils/storage.ts` for application preferences and keep storage keys centralized.
- **Quality gate:** `npm run lint` and `pnpm run lint` are equivalent, non-mutating Biome-based checks; `pnpm run lint:fix` is the explicit rewrite command.

## Change Discipline

- Read `ARCHITECTURE-MAP.md` and relevant `docs/` before changing a domain.
- Update this map when ownership, dependency direction, or a contract changes.
- Update the relevant document and `CHANGELOG.md` after completing a task.
