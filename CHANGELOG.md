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

### Changed

- Pinned Biome `2.5.14` as the single formatter and linter for supported source files.
- Centralized storage keys, schedule thresholds, and the canonical schedule type.
- Consolidated schedule scoring and conflict tests into canonical `src/utils/__tests__/schedule.test.ts`.
- Modernized theme geometry and component radii to Duolingo standard 12px scale with 2px borders and tactile button elevation.

### Fixed

- Recovery after a failed cached semester request.

### Removed

- Unused path aliases, dead exports, Lefthook, and disconnected offline persistence code.
- Flaky wall-clock benchmark tests, dead test-utils renderer, obsolete page mocks, and misnamed duplicate performance test files.
- Disjointed 3D raster clipart (skull, missed call, locker PNGs) replaced with clean vector iconography.
- Capacitor mobile app shell, Android Studio project (`android/`), `capacitor.config.ts`, `src/native/` adapters, and 12 `@capacitor/*` dependencies, simplifying AuraIsHub into a pure web application.
- Proprietary `@netlify/neon` driver in favor of standard `@neondatabase/serverless` for universal multi-cloud compatibility (Vercel, Netlify, Docker).
