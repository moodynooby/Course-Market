# Schedule Preferences Reference

Reference for the `preferences` and constraint fields accepted by `generate_schedules`.

## Top-Level Constraints

| Field | Type | Behavior |
| :--- | :--- | :--- |
| `pinnedSections` | `Record<string, string>` | Maps `courseCode` (or `courseId`) to a locked `sectionNumber` (or `sectionId`). Pinned sections bypass `openSeatsOnly` and `blockedInstructors`. |
| `blockedInstructors` | `string[]` | Case-insensitive substring filter excluding matching instructors from non-pinned candidate sections. |
| `openSeatsOnly` | `boolean` | When `true`, excludes sections where `capacity > 0 && enrolled >= capacity`. Sections with `capacity === 0` (untracked capacity) are treated as open. |
| `maxResults` | `number` (`1`–`20`, default `5`) | Caps returned top-ranked schedules while `totalGenerated` reports how many conflict-free schedules were found. |

## `preferences` Object

| Field | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `preferredStartTime` | `"HH:mm"` (24h) | `"08:00"` | Soft preference; earlier classes reduce schedule score. |
| `preferredEndTime` | `"HH:mm"` (24h) | `"18:00"` | Soft preference; later classes reduce schedule score. |
| `maxGapMinutes` | `number` (`0`–`600`) | `60` | Maximum preferred idle gap between same-day classes. |
| `preferConsecutiveDays` | `boolean` | `false` | Rewards timetables clustered onto consecutive weekdays. |
| `preferMorning` | `boolean` | `false` | Rewards morning meeting times. |
| `preferAfternoon` | `boolean` | `false` | Rewards afternoon meeting times. |
| `preferEvening` | `boolean` | `false` | Rewards evening meeting times. |
| `minCredits` | `number` | Clamped to `min(12, targetCredits)` | Lower credit bound for generated schedules. |
| `maxCredits` | `number` | Clamped to `max(18, targetCredits)` | Upper credit bound for generated schedules. |
| `avoidDays` | `DayOfWeek[]` | `[]` | Valid codes: `"M"`, `"T"`, `"W"`, `"Th"`, `"F"`, `"Sa"`, `"Su"`. |

## Common Diagnostic Reasons

When `totalGenerated === 0`, `diagnostics.reasons[].type` explains why:

- `pinned-conflicts`: Two pinned sections overlap in time. Unpin one section.
- `credit-range` / `not-enough-courses`: Credit bounds exclude the requested courses. Adjust `minCredits` or `maxCredits`.
- `no-sections`: A course has zero eligible sections after `openSeatsOnly` or `blockedInstructors` filtering.
- `all-conflicts`: Every section combination overlaps in time. Check `diagnostics.courseBreakdown` to identify courses where `conflictingSections === totalSections`.
