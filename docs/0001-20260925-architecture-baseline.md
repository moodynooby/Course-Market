# Architecture Baseline

- Status: complete
- Owners: Course-Market maintainers
- Last Updated: 2026-09-25
- Related Files: `ARCHITECTURE-MAP.md`, `package.json`, `src/`, `netlify/functions/`, `db/`

## Purpose

Establish the verified structural baseline before simplifying architecture and quality automation.

## Verified Baseline

- The project is a React 19 and TypeScript 6 Vite application.
- Netlify Functions provide server endpoints and Drizzle provides PostgreSQL access.
- Capacitor wraps the web build as an Android application.
- The source is organized by pages, components, contexts, hooks, services, utilities, native adapters, server functions, and database modules.
- `pnpm run typecheck` passes.
- `pnpm run test:fast` passes 130 tests across 11 files.
- Enabling `noUnusedLocals` and `noUnusedParameters` for the application TypeScript project produces no diagnostics.
- The repository quality gate is based on pinned Biome `2.5.14`, with Markdownlint, ShellCheck, TypeScript, and unit tests as separate checks.

## Decisions

1. Preserve schedule-generation output, score ordering, conflicts, and progress behavior during structural refactors.
2. Preserve public Netlify response contracts unless a product change explicitly alters them.
3. Keep explicit database projections to prevent accidental PII exposure.
4. Prefer deletion, standard-library behavior, or existing platform features over new dependencies and wrappers.
5. Make the complete quality gate non-mutating; fixes belong in a separate command.
6. Split large files only along independently understandable responsibilities.

## Follow-up

The implementation record for the simplification and compliance work is `docs/0002-20260925-simplification-and-compliance.md`.
