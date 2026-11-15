# Unified Reactive Persistence Architecture

- Status: complete
- Owners: Core Architecture
- Last Updated: 2026-11-15
- Related Files: `src/context/CourseSelectionContext.tsx`, `src/hooks/useAutoPersistence.ts`, `src/context/ConfigContext.tsx`, `src/components/SchedulePreferences.tsx`, `src/utils/storage.ts`, `db/validation.ts`, `netlify/functions/user-profile.ts`

## Context

Prior to this change, course selections, pinned courses, active semester selection, and schedule preferences suffered from data loss, race conditions, and out-of-order writes. The primary architectural cause was fragmented state distributed across independent components (`CoursesPage`, `DashboardPage`, `SchedulePreferences`, and `useSemesterData`), coupled with unmount-cancelled `setTimeout` timers (2000ms in `CoursesPage` and 5000ms in `SchedulePreferences`).

## Architecture Decisions

1. **Unified Domain State Store (`CourseSelectionContext`)**:
   - Single source of truth for active semester, catalog data, selected course sections, pinned sections, and derived schedules.
   - Immediate in-memory updates so page transitions (e.g. from `CoursesPage` to `DashboardPage`) reflect selections instantly without reload or network delays.
   - Atomic semester switching that resets course selections and pins simultaneously to prevent stale cross-semester leakage.

2. **Coalesced Auto-Persistence Engine (`useAutoPersistence`)**:
   - Dual persistence: writes immediately to `localStorage` as an offline-safe cache and batches server updates with a 300ms debounce.
   - Guaranteed flush: flushes pending saves on component unmount, `visibilitychange` (tab switch or mobile app backgrounding), and `beforeunload` (browser close or refresh).
   - Rejection recovery with user toast notification.

3. **Decoupled Preferences Pipeline**:
   - Eliminated the 5-second `autoSave` unmount-cancelled timer in `SchedulePreferences.tsx`.
   - Connected preference changes directly to `ConfigContext` via the auto-persistence engine with immediate flush on dialog close.
   - Added anti-loop guard (`skipCloudSync`) when pulling cloud preferences down to the client.

4. **Storage & Validation Hardening**:
   - Fixed `src/utils/storage.ts` where arrays were converted into indexed objects during shallow merge.
   - Updated `db/validation.ts` to allow empty string phone deletion and clean `{}` payload clearing for selections.

## Verification

- `useAutoPersistence.test.ts`: verified debouncing, rapid coalescing, unmount flush, visibilitychange flush, and error callbacks.
- `storage.test.ts`: verified array storage without conversion to indexed objects.
- `validation.test.ts`: verified phone clearing and nullable transformations.
- `npm run lint`: all Biome checks, Markdownlint, ShellCheck, TypeScript typechecking, and 20 Vitest test suites (170 tests) passed cleanly.
