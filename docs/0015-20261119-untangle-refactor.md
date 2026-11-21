# Untangle Codebase Refactor

- Status: complete
- Owners: frontend team
- Last Updated: 2026-11-20
- Related Files: `src/utils/generation.ts`, `src/utils/schedule-time.ts`, `src/services/search.ts`, `src/utils/schedule.ts`, `mcp/tools.ts`, `mcp/create-server.ts`, `netlify/functions/schedules.ts`, `api/[...path].ts`

## Objective

Performed the full `untangle-codebase` refactor: deleted dead production code, extracted shared helpers, removed duplication across client/server/MCP, and cleaned up tests and comments while preserving behavior (schedule output ordering, scores, section membership, conflict metadata, dedup/clustering, labels, progress callbacks) and dual-platform response shapes.

## Waves

### Wave 1a — Dead code and surplus

- Deleted: `calculateAbsoluteScheduleScore`, `computeScheduleFeatures`, `COMPACT_DAY_THRESHOLD`, `getScheduleIntrinsicQuality`, `OptimizationPanel` + its test, unused `cancel`/`isPending` on `AutoPersistenceController`, `storage.keys`, `env.MODE`/`env.IS_PROD`, the unreachable throw in `db/migrate.ts`, and the dead phone state in `OnboardingPage`.

### Wave 1b — Shared time vocabulary

- Created `src/utils/schedule-time.ts` as the single source for day maps, `timeToMinutes`, the cached parser, and `getTimeBand`. Updated `schedule.ts`, `embeddings.ts`, `schedule-generator.ts`, `search.ts`, `icsExport.ts`, `googleCalendar.ts`, `CalendarView.tsx`, `ScheduleExplorerDialog.tsx`, and `mcp/tools.ts` to import from it.

### Wave 1c — Type and alias collapse

- Replaced the `GeneratedSchedule` alias with `Schedule`; deleted `src/utils/schedule-types.ts`; removed pass-through conversions from `useScheduleGeneration.ts`; removed the speculative `GeneratorOptions.signal`.
- Moved `GeneratorOptions` to `schedule-generator.ts`, `SearchResult` to `services/search.ts`, and `DEFAULT_MAX_SCHEDULES` to `constants.ts`.

### Wave 2 — Single generation orchestrator

- Created `src/utils/generation.ts` (`generateScheduleCandidates`) as the one pipeline shared by the client hook, the Netlify `schedules` handler, and the MCP `generate_schedules` tool. Server and client defaults collapsed into `DEFAULT_PREFERENCES`; `minCredits` is clamped to target credits in the orchestrator (bug-fix level: previously the server copy didn't).
- Deleted the MCP `DEFAULT_PREFERENCES` copy.

### Wave 3 — Pure search

- Removed `buildCourseIndex`/`buildTradeIndex`; `searchCourses`, `searchTradeIndex`, and `searchSchedules` now take input data plus `WeakMap` caches. Updated callers in `CoursesPage`, `TradingPage`, `CourseSelectionContext`, and `useScheduleGeneration`.

### Wave 4 — Server/MCP parity

- Added `netlify/functions/lib/request.ts` (`parseJsonBody`), `lib/catalog.ts` (course/section column lists and mappers), a single `HandlerResult` in `lib/types.ts`, and replaced 9 bare `.select()` calls with explicit column lists in `courses.ts`/`semesters.ts`.
- Unified `mcp/tools.ts` error and handler results behind `jsonToolResult`; removed MCP capability constants.

### Wave 5 — Test pruning

- Deleted vacuous/duplicate/source-text/internal-wiring tests; rewrote regression tests against behavior: `boundary.test.ts`, `adapter.test.ts` (real route + 404), `trades-contract.test.ts`, `usePreferenceSync.test.ts`, `authReturn.test.ts`, and others.

### Wave 6 — Comment cleanup

- Removed comments that only restate the code. Workaround comments were removed where the refactor made the workaround obsolete (e.g. the `signal` cancellation in `useScheduleGeneration`).

## Follow-up cleanup (post-Wave-6)

- Unified `hasOpenSeats`/`seatsRemaining` into `src/utils/schedule.ts` and reused them in `mcp/tools.ts`, `CoursesPage`, and `CalendarView` conflict computation (`getConflictingSectionIds`).
- Extracted `netlify/functions/lib/push.ts` `createJwt`; `db/env.ts` (`readDatabaseUrl`) is now the single resolver of `DATABASE_URL`/`NETLIFY_DATABASE_URL`; `mcp/create-server.ts` resource handlers share `jsonContents`; `useProfessorsMap` simplified with a module-level loader; `useAutoPersistence` decoupled from `StorageKey` via `persistLocal`; `RateProfessorModal` reset logic extracted to `resetForm`.
- Removed the 7 redundant Vercel pass-through wrappers (`api/courses.ts`, `api/professors.ts`, `api/semesters.ts`, `api/schedules.ts`, `api/trades.ts`, `api/user-profile.ts`, `api/mcp.ts`); `api/[...path].ts` routes them identically on Vercel.
- `SITE_URL`/`SITE_DOMAIN` added to `src/utils/constants.ts`; `LoginPage`/`CallbackPage`/`OnboardingPage` share `resolveStateFrom`/`toSafeRelativeUrl` from `src/utils/authReturn.ts`.
- Nav accent colors consolidated via `resolveNavAccent`/semantic `NavAccent` in `NavLinks`/`MobileNav`; `CalendarToolbar` props narrowed to an inline/fullscreen discriminated union; search debounce literals centralized in `src/utils/constants.ts`; `usePreferenceSync` now clears `PREFS_DIRTY` only after a successful cloud push.

Skipped as ambiguous or intentional: nav accent hex duplication (branding colors differ per mode), `CalendarToolbar` variant/`fullscreen` props, and the MCP prompts (display copy for server users, distinct from `SKILL.md` guidance for agent skill users).

## Behavior Preserved

- Schedule output ordering, deterministic scores, section membership, conflicts, progress callbacks, and clustering labels are unchanged (`architecture-map.md#schedule-pipeline`).
- Both `netlify/functions/` and `api/` respond identically per `ARCHITECTURE-MAP.md` dual-platform contracts.
- MCP remains read-only, unauthenticated, and courses/schedules-only.
- Vercel response shapes unchanged after removing the redundant wrappers.

## Verification

- `pnpm run typecheck` — clean.
- Full gate (`pnpm run lint`) passes: Biome, Markdownlint, ShellCheck, TypeScript, full test suite.
- Earlier full run noted a worker-fork error ("Worker exited unexpectedly"); re-verified clean in the final gate run.
