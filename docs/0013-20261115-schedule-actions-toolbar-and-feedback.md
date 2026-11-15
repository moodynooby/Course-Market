# Schedule Actions Toolbar and Feedback Architecture

- Status: complete
- Owners: frontend team
- Last Updated: 2026-11-15
- Related Files: `src/pages/DashboardPage.tsx`, `src/components/dashboard/OptimizationPanel.tsx`, `src/hooks/useScheduleGeneration.ts`, `src/context/ToastContext.tsx`, `src/utils/schedule-prefilter.ts`, `netlify/functions/schedules.ts`

## Context & Problem

Previously, the course optimization and alternatives generation controls were placed in an `OptimizationPanel` card rendered underneath `SelectedCoursesList` in the right dashboard column. As students selected 3 or more courses, the cards in the list pushed the optimization controls downwards and off-screen below the viewport fold. Furthermore, the action hierarchy prioritized direct, unconfirmed auto-mutation over safe timetable exploration, provided zero completion or "already optimal" feedback, and rendered errors as unstyled text captions without accessible attributes.

Additionally, the schedule optimization action was failing when students had selected fewer than 12 credits (such as 1, 2, or 3 courses). Because `minCredits` defaulted to 12 in `DEFAULT_PREFERENCES`, the generator pruned every single combination during backtracking whenever the selected course credits were below 12, returning 0 candidates and silently doing nothing.

## Changes

1. **Reframed Action Hierarchy & Header Toolbar:**
   - Reframed the optimization action from a vague sparkle button to **"Auto-Optimize Schedule"** (`[Auto-Optimize Schedule]`, `variant="outlined"`), with clear copy explaining that it automatically resolves section conflicts and matches time/professor preferences.
   - Primary CTA: `[Explore Alternatives]` (`variant="contained"`, `color="secondary"`, `startIcon={<GridView />}`).
   - Undo Control: `[Undo]` button rendered conditionally when an automated optimization has changed the timetable.
   - Settings: `[Preferences]` button.
   - Immune to course addition: Controls remain pinned at the top of the dashboard regardless of list height.
2. **Fixed Optimization Pruning Bug:**
   - Clamped `minCredits` in both `useScheduleGeneration.ts` and `netlify/functions/schedules.ts` against the total credits of selected courses so schedules with fewer than 12 credits are never pruned.
   - Added conflict-aware feedback: notifies users when section conflicts are successfully resolved or when current pins cannot be resolved without changes.
3. **Multi-Tier Feedback:**
   - Integrated with `useToast` via `useOptionalToast` for non-intrusive notifications on schedule optimization success, conflict resolution, schedule applied from explorer, and unchanged (already optimal) state notifications.
   - Added accessible loading spinners (`CircularProgress`) inside buttons when active and a top-level `LinearProgress` during alternatives generation.
   - Added accessible `Alert` component with `role="alert"` for generation error states.
   - Added descriptive `Tooltip` components explaining required course selection when actions are disabled.
4. **Component Modernization:**
   - Updated `OptimizationPanel` to follow the reordered action hierarchy, tactile 3D styling with 12px radii, linear progress indicator, and alert handling.
   - Added defensive checks in `schedule-prefilter.ts` for preferences validation.
5. **Test Coverage:**
   - Added unit tests for `OptimizationPanel` in `src/components/dashboard/__tests__/OptimizationPanel.test.tsx` (8 tests).
   - Added unit tests for `useScheduleGeneration` in `src/hooks/__tests__/useScheduleGeneration.test.ts` (5 tests), including conflict resolution and undo verification.
