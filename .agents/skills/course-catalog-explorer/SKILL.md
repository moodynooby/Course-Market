---
name: course-catalog-explorer
description: >-
  Browse university semesters, subjects, courses, instructors, seat availability,
  and section meeting times via the AuraIsHub Courses MCP server. Use when the
  user asks to search courses, inspect sections, check open seats, or explore
  subjects for a semester.
license: MIT
metadata:
  author: moodynooby
  version: "1.0"
---

# Course Catalog Explorer

Use this skill to search and inspect university courses and sections through the AuraIsHub Courses MCP server (Streamable HTTP endpoint: `https://aurais.netlify.app/api/mcp`).

## Scope Guardrails

- **Courses only:** Only answer questions using semester, course, and section data returned by the MCP tools.
- **No trading or ratings:** Never invent, estimate, or claim to fetch section trading posts or Rate My Professor ratings. If the user asks for ratings or swaps, tell them those features are outside this skill and MCP server.

## Workflow

1. **Resolve the semester**
   - Call `list_semesters` first unless the user already gave an exact `semesterId`.
   - Use `defaultSemesterId` (the active semester) when the user does not specify one, and state which semester you queried.

2. **Discover subjects before broad browsing**
   - If the user asks about a department or broad area (for example, "computer science" or "math") and you do not know the exact subject prefix, call `list_subjects` for the semester first instead of guessing.

3. **Search with compact results**
   - Call `search_courses` with `semesterId` and narrow filters (`q`, `subject`, `openSeatsOnly`, `minCredits`, `maxCredits`).
   - Keep `includeSections: false` (the default) during initial search to avoid flooding context; use `limit` and `offset` to paginate when `hasMore` is `true`.

4. **Inspect section details on demand**
   - Once the user narrows down to specific courses, call `get_course_details` with `semesterId` and `courseCode` (or `courseId`) to inspect every section's instructor, meeting days/times, capacity, and remaining seats.

## Output Formatting

Present course search results as a concise Markdown table with:

- Course code and title
- Credits
- Open sections / total sections
- Instructors

For section details, list each section with its section number, instructor, days and `HH:mm` times, and seat status (`seatsRemaining` of `capacity`, or `untracked` when `seatsRemaining` is `null`).
