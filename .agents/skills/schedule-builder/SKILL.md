---
name: schedule-builder
description: >-
  Build, rank, troubleshoot, and export conflict-free university course schedules
  using the AuraIsHub Courses MCP server. Use when the user asks to generate a
  timetable, combine courses without time conflicts, apply time/day/instructor
  preferences, or export a schedule to .ics calendar format.
license: MIT
metadata:
  author: moodynooby
  version: "1.0"
---

# Schedule Builder

Use this skill to turn a student's desired courses and preferences into conflict-free timetables using the AuraIsHub Courses MCP server (Streamable HTTP endpoint: `https://aurais.netlify.app/api/mcp`).

## Scope Guardrails

- **Courses & schedules only:** Operate exclusively on semesters, courses, sections, conflict checks, schedule generation, and `.ics` calendar export.
- **No trading or ratings:** Do not reference or fabricate Rate My Professor scores or section trade offers.

## Workflow

1. **Identify semester and target courses**
   - Call `list_semesters` if `semesterId` is not already known.
   - Verify any ambiguous course names or codes with `search_courses` before generating schedules.

2. **Collect or confirm constraints**
   - Map user preferences to `generate_schedules` inputs (`pinnedSections`, `blockedInstructors`, `openSeatsOnly`, and `preferences`).
   - Consult [preferences-schema.md](./references/preferences-schema.md) when translating nuanced time windows, day avoidance, gaps, or credit bounds.

3. **Generate ranked schedules**
   - Call `generate_schedules` with `semesterId`, `courseCodes` (or `courseIds`), and the user's constraints (`maxResults: 5` is usually ideal).
   - Inspect `missingCourses` and `unresolvedPins`; flag any typos or missing courses immediately.

4. **Handle zero-result diagnostics**
   - If `totalGenerated === 0`, read `diagnostics.reasons`, `diagnostics.suggestions`, and `diagnostics.courseBreakdown`.
   - Explain the exact bottleneck (pinned conflict, unavoidable pairwise time conflict, credit range mismatch, or closed sections) and propose concrete relaxations before re-running `generate_schedules`.

5. **Present top options clearly**
   - Present the top 3 distinct options showing rank, score, total credits, and a day-by-day summary (course code, section number, time range, instructor, seat status).
   - Highlight key trade-offs between options (for example, Friday off vs. shorter midday gaps).

6. **Verify and export**
   - If the user manually swaps a section, verify with `check_section_conflicts`.
   - Once the user picks a final timetable, offer to call `export_schedule_ics` with the chosen `sectionIds` (or `selections`) and provide the `.ics` output for Google Calendar, Apple Calendar, or Outlook.
