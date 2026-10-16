# Course Browser UI/UX and Missing Functionality Enhancements

- Status: complete
- Owners: Frontend / Course Planning
- Last Updated: 2026-10-16
- Related Files: `src/pages/CoursesPage.tsx`, `src/components/CourseCard.tsx`, `src/components/__tests__/CourseCard.test.tsx`

## Context

The Course Browser (`src/pages/CoursesPage.tsx`) and course card component (`src/components/CourseCard.tsx`) provide the primary interface for students to browse courses, inspect available sections, and make course selections for timetable generation.

Previously, several standard and expected features were absent:

1. Course cards were only expandable via a tiny chevron button rather than the entire card header.
2. Section seat capacity and enrollment status (`enrolled / capacity`) were stored in the database but completely hidden from the UI.
3. Collapsed course cards lacked section counts, subject tags, and instructor previews.
4. Time slots lacked visual day-of-week badges.
5. Conflict indicators were generic warning tags with no indication of which selected course or time slot caused the clash.
6. Course descriptions were never surfaced.
7. Filtering lacked quick filter chips ("Open Seats Only", "No Conflicts", "Selected Only") and active filter reset controls.
8. Selecting courses lacked a direct call to action (CTA) and persistent visibility to guide students to schedule generation.

## Implemented Enhancements

### 1. Interactive CourseCard Component

- **Clickable Header**: Made the entire header interactive with accessible keyboard navigation (`Enter` / `Space`) and hover states.
- **Richer Metadata**: Added subject badge chips, credit badges, section count labels, and an instructors summary in the collapsed state.
- **Course Description Drawer**: Displayed formatted course descriptions in the expanded accordion view when available.
- **Visual Day Pills**: Converted plain time strings into stylized day-of-week badges (e.g. `M`, `W`, `F`) in `primary.main` tint.
- **Seat Capacity Badges**: Added live seat availability indicators (`X seats left (enrolled/capacity)` or `Full (0 seats)`) color-coded by availability.
- **Detailed Conflict Resolution**: Integrated `conflictDetails` mapping to display exactly which course and section clashes with a section in tooltips and badges.

### 2. Streamlined Workflow & Selection Dock in CoursesPage

- **Top Selection Summary**: Added credit goal guidance (12–18 credits target) and a primary "Generate Schedules" CTA navigating to the timetable dashboard.
- **Floating Sticky Action Dock**: Rendered a mobile-responsive floating action dock positioned above the bottom navigation bar on mobile and centered on desktop viewports.
- **Quick Filter Chips**: Added quick toggles for "Selected Only", "Open Seats Only", and "No Conflicts", alongside live result count indicators and a 1-click "Reset Filters" action.
- **Virtuoso Scroll Padding**: Added adaptive bottom padding to the virtualized list so floating controls never obscure course cards.

## Verification

- Added unit tests in `src/components/__tests__/CourseCard.test.tsx` testing collapsed/expanded presentation, keyboard accessibility, seat availability badges, day pills, selection callbacks, and conflict tooltips.
- Validated via `pnpm run lint:biome` and `pnpm run lint:markdown`.
- Validated via `pnpm run typecheck`.
