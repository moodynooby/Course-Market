# Schedule Conflict Detection and Highlighting Resolution

- Status: complete
- Owners: Core Scheduling & UI
- Last Updated: 2026-11-15
- Related Files: `src/utils/schedule.ts`, `src/components/CalendarView.tsx`, `src/pages/CoursesPage.tsx`, `src/pages/TradingPage.tsx`, `src/utils/schedule-diagnostics.ts`, `src/utils/schedule-prefilter.ts`, `src/utils/schedule-generator.ts`

## Context & Problem

The schedule conflict system had several interconnected bugs affecting conflict calculation, UI highlighting, trade validation, and empty schedule diagnostics:

1. `CalendarView.tsx` determined event conflicts by running `.includes(section.sectionNumber)` against strings formatted as `"001 and 002 conflict"`. This caused widespread false positives for identical section numbers across different courses and substring collisions (`"1"` in `"10"`).
2. `CoursesPage.tsx` flagged alternative sections of the same course as conflicting with the currently selected section of that same course, despite section selection being mutually exclusive.
3. `TradingPage.tsx` flagged offered and wanted sections as conflicting with themselves or with the section being traded away.
4. `hasSectionConflict` lacked a self-conflict guard, reporting that a section conflicted with itself whenever tested with identical time slots.
5. `schedule-diagnostics.ts` aborted course conflict checks prematurely due to an inverted loop break condition, failing to flag genuine conflicts, and displayed an inverted error message for credit bounds.
6. Prefiltering and schedule footprinting ignored `startDate` and `endDate`, causing part-of-term / mini-courses to be erroneously deduplicated.
7. `isSlotActiveDuring` truncated slot activity on the final day due to UTC midnight parsing.

## Decisions & Implementation

1. **Exact Calendar Section Conflict Highlighting:** `CalendarView.tsx` now derives a `Set<string>` of conflicting section IDs directly from sections via `hasSectionConflict`, eliminating substring matching and cross-course section number collisions.
2. **Defensive Self-Conflict Guard:** `hasSectionConflict` immediately returns `false` if comparing identical sections or identical section IDs.
3. **Course Code Enrichment:** `checkConflicts(sections, courses)` now enriches conflict descriptions with course codes when `courses` are provided (`"CS101 Sec 001 and MATH101 Sec 002 conflict"`).
4. **Isolated Same-Course Selection:** `CoursesPage.tsx` and `TradingPage.tsx` now verify `selected.courseId !== section.courseId` so alternative sections of the same course are never flagged as conflicting.
5. **Accurate Diagnostic Loop:** `schedule-diagnostics.ts` checks if a section has unavoidable conflicts with any required course (`otherSections.every((other) => hasSectionConflict(section, other))`), and clarifies the credit limit message.
6. **Date-Range Aware Deduplication:** Prefilter keys and schedule footprints now include `startDate` and `endDate`.
7. **End-of-Day Calendar Inclusion:** `isSlotActiveDuring` extends the end date boundary through 23:59:59.999 local time.

## Verification

- `pnpm exec vitest run src/utils/__tests__/schedule.test.ts src/utils/__tests__/schedule-prefilter.test.ts src/utils/__tests__/schedule-diagnostics.test.ts`: Passed (36/36 tests).
- Full Vitest suite: Passed across all 21 test files (175/175 tests).
- `pnpm run typecheck`: Passed with zero errors across all three TypeScript projects.
- `pnpm run lint:biome`: Formatted and checked with zero errors.
- `pnpm run lint:markdown`: Passed with zero errors.
- `pnpm run lint:shell`: Passed with zero errors.
