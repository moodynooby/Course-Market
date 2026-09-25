# Simplification and Agent Compliance

- Status: complete
- Owners: Course-Market maintainers
- Last Updated: 2026-09-25
- Related Files: `AGENTS.md`, `ARCHITECTURE-MAP.md`, `CONTRIBUTING.md`, `package.json`, `biome.json`, `.github/workflows/ci.yml`

## Goal

Reduce unnecessary complexity and make the repository comply with `AGENTS.md` without changing schedule-generation or server API behavior.

## Scope

- Add the mandated Biome-based, non-mutating quality gate and staged checks.
- Replace overlapping or unused tooling and configuration.
- Remove confirmed dead code and duplicated domain types.
- Centralize persistence and schedule constants.
- Harden the semester request cache and explicit error handling.
- Decompose large modules only along clear ownership boundaries.
- Keep documentation, architecture, and changelog current.

## Invariants

- Preserve schedule scores, ordering, conflicts, section membership, and progress callbacks.
- Preserve public Netlify response shapes and explicit database projections.
- Preserve web and native feature interfaces.
- Add only one owner-boundary regression test for the semester cache bug.
- Keep Biome pinned to `2.5.14` and run the complete gate before marking this record complete.

## Verification Baseline

- Typecheck: passing.
- Fast tests: 130 passing.
- Unused application TypeScript diagnostics: none.

## Implemented

- Replaced ESLint, Prettier, EditorConfig checking, Lefthook, and lint-staged with Biome `2.5.14`, Markdownlint, ShellCheck, TypeScript, unit tests, and Husky.
- Added pull-request and main-branch CI plus frozen-lockfile release installs.
- Removed unused path aliases, dead exports, and the disconnected offline persistence module.
- Collapsed `GeneratedSchedule` into the canonical `Schedule` type and removed the unused display name.
- Centralized storage keys, schedule time bands, score thresholds, and course-selection mapping.
- Fixed cached semester requests so transient failures can retry.
- Added explicit environment validation for Drizzle and Netlify database clients.
- Extracted calendar event rendering, schedule details, and the trading loading skeleton into focused components.

## Final Verification

- `npm run lint`: passing.
- Full test suite: 13 files, 133 tests passing.
- `pnpm run build`: passing.
- `pnpm run lint:staged`: passing with no staged files.
