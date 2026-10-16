# Test Suite Audit and Simplification

- Status: complete
- Owners: Course-Market maintainers
- Last Updated: 2026-10-16
- Related Files: `src/utils/schedule-prefilter.ts`, `netlify/functions/lib/wrap.ts`, `netlify/functions/lib/auth.ts`, `netlify/functions/trades.ts`, `src/native/auth.ts`, `src/services/apiClient.ts`, `src/utils/schedule.ts`, `src/test/setup.ts`, `package.json`

## Goal

Audit and streamline the test suite according to the lazy elite developer guidelines in `AGENTS.md`: eliminate flaky, redundant, and dead test scaffolding that slowed down builds, and establish assert-based regression coverage on critical breakable boundaries currently sitting at 0% coverage.

## Scope

- Delete wall-clock timing tests (`src/test/benchmark.slow.test.ts`) that produced non-deterministic failures on varying machine CPU load.
- Remove dead test infrastructure (`src/test/test-utils.tsx`, `src/test/mocks.tsx`) that had broken page mocks and zero imports across the project.
- Consolidate misnamed `src/test/performance.test.ts` into canonical `src/utils/__tests__/schedule.test.ts` and delete duplicate helper files.
- Add regression coverage for schedule prefiltering deduplication and pinned section constraints (`src/utils/__tests__/schedule-prefilter.test.ts`).
- Add server auth, CORS, and privacy projection tests for Netlify Functions (`netlify/functions/__tests__/auth-and-wrap.test.ts`, `netlify/functions/__tests__/trades-contract.test.ts`).
- Add native OAuth deep-link callback parser tests (`src/native/__tests__/auth.test.ts`).
- Add client API timeout error handling tests (`src/services/__tests__/apiClient.test.ts`).

## Invariants

- Preserve schedule generation output, scoring order, conflict detection, and prefilter deduplication.
- Preserve public Netlify server functions response contracts and column projections.
- Preserve strict `npm run lint` quality gate (Biome, Markdownlint, ShellCheck, TypeScript, Vitest).

## Verification

- `npm run lint`: passed cleanly (15 test files, 149 tests passing).
- `pnpm run test:coverage`: lines coverage in `src/utils/schedule-prefilter.ts` increased from 0% to 100%, `src/services/apiClient.ts` increased to 73%, and server contracts in Netlify functions are fully verified.
