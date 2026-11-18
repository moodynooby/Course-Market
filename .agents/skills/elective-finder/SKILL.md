---
name: elective-finder
description: >-
  Find open-seat elective courses that fit cleanly into free slots of a
  student's existing schedule without time conflicts via the AuraIsHub Courses
  MCP server. Use when the user already has fixed/pinned classes and wants
  compatible course recommendations to reach their target credit load.
license: MIT
metadata:
  author: moodynooby
  version: "1.0"
---

# Elective Finder

Use this skill when a student already has fixed classes and wants to find open-seat electives that fit without time conflicts via the AuraIsHub Courses MCP server (Streamable HTTP endpoint: `https://aurais.netlify.app/api/mcp`).

## Scope Guardrails

- **Courses only:** Base all recommendations strictly on semester course catalog, seat availability, credits, and time-slot compatibility.
- **No trading or ratings:** Do not include or fabricate Rate My Professor ratings or section swap listings.

## Workflow

1. **Confirm semester and baseline schedule**
   - Resolve `semesterId` via `list_semesters` if omitted.
   - Call `check_section_conflicts` on the user's fixed sections (`sectionIds` or `selections`) to verify their current weekly time blocks and total credits.
   - If the fixed sections already conflict, flag that immediately before searching electives.

2. **Find open-seat candidate courses**
   - If the user mentions an interest area without an exact subject code, call `list_subjects` first.
   - Call `search_courses` with `openSeatsOnly: true`, `includeSections: true`, and appropriate `subject`, `q`, `minCredits`, or `maxCredits` filters (for example, remaining credits needed).
   - Exclude courses already in the user's fixed schedule.

3. **Filter for non-conflicting sections**
   - For the strongest candidate courses, verify compatibility against the fixed sections by calling `generate_schedules` with the fixed courses in `pinnedSections` (plus `openSeatsOnly: true` and any user time/day preferences) or `check_section_conflicts` for specific candidate sections.

4. **Present compatible electives**
   - List only verified non-conflicting electives with:
     - Course code, title, and credits
     - Compatible section number(s), days/times, instructor, and remaining seats
     - Resulting total credits and how the elective fits the existing weekly shape (for example, preserves a free Friday or minimizes gaps)
   - Offer to export the updated schedule with `export_schedule_ics`.
