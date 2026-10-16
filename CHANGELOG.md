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
- Vibrant & Social design overhaul: Electric Indigo (`#4f46e5`) and Obsidian (`#0f172a` / `#0b0f19`) palette, modern SVG micro-badges for navigation, tactile trade card exchange blocks, and playful "✨ Peak Aura" schedule badges.

### Changed

- Pinned Biome `2.5.14` as the single formatter and linter for supported source files.
- Centralized storage keys, schedule thresholds, and the canonical schedule type.
- Consolidated schedule scoring and conflict tests into canonical `src/utils/__tests__/schedule.test.ts`.
- Modernized theme geometry and component radii from 32px hyper-bubbles to a disciplined 10px–14px scale with 1px hairline border strokes.

### Fixed

- Recovery after a failed cached semester request.

### Removed

- Unused path aliases, dead exports, Lefthook, and disconnected offline persistence code.
- Flaky wall-clock benchmark tests, dead test-utils renderer, obsolete page mocks, and misnamed duplicate performance test files.
- Disjointed 3D raster clipart (skull, missed call, locker PNGs) replaced with clean vector iconography.
- Capacitor mobile app shell, Android Studio project (`android/`), `capacitor.config.ts`, `src/native/` adapters, and 12 `@capacitor/*` dependencies, simplifying AuraIsHub into a pure web application.
- Proprietary `@netlify/neon` driver in favor of standard `@neondatabase/serverless` for universal multi-cloud compatibility (Vercel, Netlify, Docker).
