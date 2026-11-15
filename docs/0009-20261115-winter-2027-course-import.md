# Winter 2027 Course Directory Import

- Status: complete
- Owners: Persistence, Course Catalog
- Last Updated: 2026-11-15
- Related Files: `scripts/csv_to_semester_json.py`, `db/seed.ts`, `db/schema.ts`, `Course_Directory_Winter_2027.xlsx`

## Context & Motivation

The Winter 2027 directory arrives in a new `Schedule` format:

```text
Section 1 | 08:00-09:30 (Wed) (04-01-2027 to 18-04-2027)
```

The previous importer only understood the legacy `Mon [08:00 to 09:30] [04-01-2027 to 18-04-2027]` shape, so it produced zero time slots for every Winter 2027 course. It also only read `.csv`, ignored the course description column, and omitted the `semesters` row that courses and sections reference — making a fresh database seed fail on the foreign key.

## Import Contract

- **Input:** one `.xlsx` workbook (first worksheet) or one `.csv` export of the same sheet. XLSX parsing uses the Python standard library only: shared strings, inline strings, and cached cell values.
- **Output:** `.import/semesters/{semesterId}.json` (gitignored scratch file) with `semesterId`, `semesterName`, and a flat `sections` array. The application never reads this file; courses are served from Postgres.
- **Section id:** `{courseCode}-{sectionNumber}-{semesterId}` lowercased and stripped, for example `COM101-001-winter2027`. Including the semester avoids collisions when the same course is offered in a later year.
- **Section numbers** are zero-padded to three digits. Rows without a section header, and `TBA` schedules, produce a single section with no time slots.
- **Duplicates:** identical meetings repeated in one schedule cell are deduplicated; two sections sharing an id fail the import.
- **Fields:** course code, name, subject (leading letters), credits, instructor (placeholder names removed), description, and time slots with ISO start/end dates.
- **Validation:** the converter aborts on empty output, duplicate sections, unknown weekdays, or meetings that end before they start.

## Seed Contract

`pnpm run db:seed [file…]` defaults to every `.import/semesters/*.json` when no file is passed. Per file it:

1. Upserts the `semesters` row (preserving an existing `isActive` value).
2. Deletes sections for that semester that are absent from the file.
3. Upserts courses, then sections, in batches of 500 rows.
4. Deletes courses for that semester that are absent from the file.
5. Compares database row counts with the file and exits non-zero on mismatch.
6. Deletes the seeded file (and the now-empty `.import/` tree) so the JSON cannot drift into a second source of truth.

The refresh semantics mean a corrected directory replaces stale data instead of accumulating it. User profile selections are stored as JSON, so a removed section simply becomes unresolvable rather than blocking the delete.

## Verification

- Winter 2027 directory: 328 courses, 475 sections, 28 sections with TBA times, 25 duplicate meeting lines removed.
- Independent cross-check of the generated JSON against the CSV: no missing or extra `(courseCode, sectionNumber)` pairs; every scheduled meeting parses to a valid weekday and a positive time range.
- The `.xlsx` and `.csv` inputs produce byte-identical JSON for Winter 2027, so the Excel workbook is the canonical input and the CSV export is only a convenience copy.
- XLSX parsing exercised against a synthetic workbook containing shared strings, inline strings, numeric credits, a multi-line schedule, and a `TBA` row.
- `tsc -p tsconfig.netlify.json` and `biome check db/seed.ts` pass.
- Seeded into the database: 328 courses and 475 sections for `Winter2027`, compared row by row against the generated file with zero mismatches and zero extra rows. Re-converting from the workbook and re-seeding reproduced the same counts with no stale-row deletions.
- Database totals after seeding: `Monsoon2026` 195/286, `Winter2025` 373/365, `Winter2027` 328/475 (courses/sections).
- The scratch `.import/` directory is removed after a successful seed; only the workbook and the database remain.

## Known Gaps

- Capacity and enrolled counts are not present in the directory, so both remain `0`.
- Prerequisite, antirequisite, GER, school, level, and course-area columns are not persisted; the schema has no columns for them yet.
