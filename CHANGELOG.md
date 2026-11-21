# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to semantic versioning once releases are published.

## [Unreleased]

### Added

- Architecture map, contributor guide, documentation standards, and architecture baseline.
- Non-mutating quality gate, Husky staged checks, and pull-request CI enforcement.
- Focused calendar event, schedule details, and trading skeleton components.
- Course Browser UI/UX overhaul: clickable card headers, subject badges, section counts, instructor previews, seat availability indicators, day pills, detailed conflict tooltips, quick filter chips ("Selected", "Open Seats", "No Conflicts"), and floating sticky selection dock with "Generate Schedules" primary CTA.
- Essential regression tests for schedule prefiltering combinatorics, Netlify function auth/CORS/privacy contracts, native OAuth callback routing, CourseCard UI interactions, and API client timeouts.
- Duolingo-grade design system overhaul: Vivid Red (`#ea2b2b`), cyan (`#1cb0f6`), sky-blue (`#ddf4ff`), and charcoal (`#3c3c3c`) palette, 12px geometry, tactile button feedback, and dedicated `DESIGN.md` specification for agents.
- Dual-cloud portability support: universal Node/Serverless adapter (`api/_adapter.ts`, `api/[...path].ts`), `vercel.json` rewrites and headers, and Netlify `/api/*` redirection so AuraIsHub deploys seamlessly to both Vercel and Netlify.
- Server-side schedule generation and optimization endpoint (`POST /api/schedules/generate`) with client offline fallback.
- Server-side course search and filtering endpoint (`GET /api/courses/search`) with instructor, subject, and open seats querying.
- Winter 2027 course directory import: `.xlsx` and `.csv` conversion with standard-library XLSX parsing, section-level IDs that include the semester, and course descriptions carried into the generated import file.
- Unified reactive persistence architecture: `CourseSelectionContext` centralized domain state and `useAutoPersistence` coalesced auto-sync engine with guaranteed lifecycle flushes.
- Dashboard header schedule actions toolbar: unified `[Explore Alternatives]`, `[Find Best Schedule]`, and `[Preferences]` controls adjacent to the header, immune to viewport displacement from course addition, paired with accessible loading, progress, and toast notifications.
- Courses-only Streamable HTTP MCP server (`POST /api/mcp`) with Netlify and Vercel parity, exposing 7 read-only course/schedule tools, 3 resources, and 2 prompts strictly isolated from trading, Rate My Professor, and user-profile data.
- Portable Agent Skills (`.agents/skills/course-catalog-explorer`, `schedule-builder`, and `elective-finder`) with one-line multi-agent install via `npx skills add moodynooby/Course-Market`.

### Fixed

- False-positive and cross-course calendar conflict highlighting caused by naive substring matching on ambiguous section numbers in `CalendarView`.
- Courses Page flagging alternative sections of the same course as conflicting with the currently selected section of that same course.
- Trading Page self-conflict and same-course conflict false alarms when viewing trade offers.
- Inverted break condition in `schedule-diagnostics.ts` that failed to detect multi-course section conflicts, and reversed credit diagnostic message.
- Part-of-term / mini-course section loss during prefiltering and schedule footprinting caused by date-range-blind deduplication.
- Premature cutoff of calendar events on their final meeting date in `isSlotActiveDuring`.
- Course selection, pin, and schedule preference data loss caused by component unmounts cancelling debounce timers during page navigation and dialog closing.
- Initial load race condition in `CoursesPage` that queued empty selection saves over saved profile data.
- Stale pinned courses and cross-semester course leakage during semester switching.
- LocalStorage array deserialization bug in `storage.ts` that converted arrays into indexed objects during shallow merge.
- Preference sync infinite ping-pong loop when pulling cloud preferences down to client.
- Course directory schedules in the `Section 1 | 08:00-09:30 (Wed)` format now parse into time slots instead of importing with no meetings.
- Semester seeding now creates the referenced `semesters` row and verifies row counts, so a fresh database seeds without foreign-key failures.
- Validation failure on new account onboarding caused by requiring phone numbers during profile creation.
- Native Capacitor login redirect URI configuration so mobile authentication completes via custom scheme.
- Return context preservation across auth redirects and onboarding to keep users on their intended route.
- Premature profile loading state in auth context and onboarding skip bouncing.
- Recovery after a failed cached semester request.
- Deduplicated native Auth0 callback recognition across `auth.ts`, `nativeAuth.ts`, and `deepLinks.ts`.
- Preference sync dirty flag is now cleared only after a successful cloud push, preventing lost local edits on failed sync.

### Changed

- Consolidated the divergent default-preference sets, credit clamps, and the client/server schedule-generation pipelines into the single `generateScheduleCandidates` orchestrator in `src/utils/generation.ts`; the MCP tool and client fallback now use `DEFAULT_PREFERENCES` and the orchestrator clamps `minCredits` up to target credits (previously a real bug on the server path).
- Extracted `src/utils/schedule-time.ts` (day maps, `timeToMinutes`, cached parser, `getTimeBand`), `src/utils/schedule.ts` (`hasOpenSeats`, `seatsRemaining`, `getConflictingSectionIds`), `netlify/functions/lib/push.ts` (`createJwt`), and `db/env.ts` (`readDatabaseUrl`) as single sources; MCP tools, `CoursesPage`, `CalendarView`, and `push.ts` now reuse them.
- Replaced `GeneratedSchedule` with `Schedule`, deleted `src/utils/schedule-types.ts`, moved `GeneratorOptions`/`SearchResult`/`DEFAULT_MAX_SCHEDULES` into their natural homes, and removed the speculative `signal` option.
- Replaced module-global search indexes in `services/search.ts` with input-keyed `WeakMap` caches.
- Made `useAutoPersistence` decoupled from `StorageKey` (`persistLocal`), `useProfessorsMap` use a module-level loader, and `RateProfessorModal` extract `resetForm`; `LoginPage`/`CallbackPage`/`OnboardingPage` share `resolveStateFrom`/`toSafeRelativeUrl` from `src/utils/authReturn.ts`.
- Added `SITE_URL`/`SITE_DOMAIN` to `src/utils/constants.ts` and replaced hardcoded site URLs in `CalendarView`/`icsExport`.
- Streamlined `AGENTS.md` to eliminate persona roleplay ("lazy developer"), contradictory one-liner rules, and duplicated Git/CI instructions, reducing context token overhead by over 50% for smaller context models.
- Established a structured 5-step agent execution lifecycle (`Inspect` -> `Trace` -> `Edit Surgically` -> `Verify` -> `Document`) and tiered verification ladder in `AGENTS.md`.
- Purged stale Capacitor prerequisites, native mobile build scripts, and legacy Prettier mentions from `CONTRIBUTING.md` and `docs/documentation-standards.md`, standardizing on `pnpm`.
- Streamlined authentication to require login upfront, routing directly to Google OAuth (`connection: 'google-oauth2'`).
- Simplified `LoginPage` to a focused Google sign-in action with automatic redirects for authenticated users.
- Wrapped `<Layout />` once with `<ProtectedRoute>` in `App.tsx` instead of wrapping each route individually.
- Pinned Biome `2.5.14` as the single formatter and linter for supported source files.
- Centralized storage keys, schedule thresholds, and the canonical schedule type.
- Consolidated schedule scoring and conflict tests into canonical `src/utils/__tests__/schedule.test.ts`.
- Modernized theme geometry and component radii to Duolingo standard 12px scale with 2px borders and tactile button elevation.
- Semester seeding is now a full refresh: courses and sections are upserted, rows removed from the directory are deleted, and `pnpm run db:seed` seeds every `.import/semesters/*.json` by default.
- `db:seed` and `db:migrate` read `.env` only when it exists, so shell-provided `DATABASE_URL` values work.
- Seeded scratch files under `.import/semesters/` are deleted after a successful seed, keeping the database as the only course source.

### Removed

- Dead production code: `calculateAbsoluteScheduleScore`, `computeScheduleFeatures`, `COMPACT_DAY_THRESHOLD`, `getScheduleIntrinsicQuality`, `OptimizationPanel` + its test, unused `cancel`/`isPending` on `AutoPersistenceController`, `storage.keys`, `env.MODE`/`env.IS_PROD`, the unreachable throw in `db/migrate.ts`, and dead onboarding phone state.
- Redundant Vercel pass-through wrappers (`api/courses.ts`, `api/professors.ts`, `api/semesters.ts`, `api/schedules.ts`, `api/trades.ts`, `api/user-profile.ts`, `api/mcp.ts`); `api/[...path].ts` serves them with identical responses on Vercel.
- Download App button from the top navigation header for now.
- Unused `useAuthGuard` and action-time auth interception in favor of route-level authentication.
- Unused path aliases, dead exports, Lefthook, and disconnected offline persistence code.
- Flaky wall-clock benchmark tests, dead test-utils renderer, obsolete page mocks, and misnamed duplicate performance test files.
- Disjointed 3D raster clipart (skull, missed call, locker PNGs) replaced with clean vector iconography.
- Capacitor mobile app shell, Android Studio project (`android/`), `capacitor.config.ts`, `src/native/` adapters, and 12 `@capacitor/*` dependencies, simplifying AuraIsHub into a pure web application.
- Proprietary `@netlify/neon` driver in favor of standard `@neondatabase/serverless` for universal multi-cloud compatibility (Vercel, Netlify, Docker).
