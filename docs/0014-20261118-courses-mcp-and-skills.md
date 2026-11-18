# Courses-Only MCP Server and Agent Skills

- Status: complete
- Owners: Architecture, Backend API & Agent Systems
- Last Updated: 2026-11-18
- Related Files: `mcp/`, `netlify/functions/mcp.ts`, `api/mcp.ts`, `api/[...path].ts`, `.agents/skills/`, `ARCHITECTURE-MAP.md`, `README.md`, `CHANGELOG.md`

## Context & Motivation

Students and AI coding/planning assistants benefit from structured, tool-driven access to AuraIsHub's course catalog and combinatorial schedule generator without scraping the SPA or requiring local database credentials. At the same time, user-generated trading posts, Rate My Professor reviews, and Auth0 user profiles must remain strictly excluded from public agent access.

## Key Decisions

1. **Courses-Only Hard Isolation:**
   - The MCP data layer (`mcp/data-source-db.ts`) queries only `semesters`, `semester_courses`, and `semester_sections` using explicit column projections.
   - `trades`, `professors`, `professor_ratings`, and `user_profiles` are never imported or exposed.
   - Every tool is annotated read-only and idempotent with zero authentication or PII handling.

2. **Stateless Streamable HTTP (`POST /api/mcp`) with Dual-Cloud Parity:**
   - Implemented via `@modelcontextprotocol/sdk`'s `WebStandardStreamableHTTPServerTransport` in stateless JSON-response mode (`sessionIdGenerator: undefined`, `enableJsonResponse: true`).
   - Hosted identically on Netlify (`netlify/functions/mcp.ts`) and Vercel (`api/mcp.ts` + `api/[...path].ts`) through `mcp/http-handler.ts`.
   - `OPTIONS` returns MCP-aware CORS headers; `GET`/`DELETE` return `405 Method Not Allowed` with a JSON-RPC error payload.

3. **Capability Surface:**
   - **7 Tools:** `list_semesters`, `list_subjects`, `search_courses`, `get_course_details`, `check_section_conflicts`, `generate_schedules`, `export_schedule_ics`.
   - **3 Resources:** `courses://semesters`, `courses://semesters/{semesterId}/subjects`, `courses://semesters/{semesterId}/course/{courseCode}`.
   - **2 Prompts:** `plan-semester-schedule`, `find-electives`.
   - Reuses existing pure scheduling and iCalendar utilities (`src/utils/schedule*.ts`, `src/utils/icsExport.ts`) without duplicating domain algorithms.

4. **Cross-Agent Skills with One-Line Install (`skills.sh`):**
   - Added 3 Agent Skills under `.agents/skills/`: `course-catalog-explorer`, `schedule-builder` (with progressive-disclosure `references/preferences-schema.md`), and `elective-finder`.
   - Placing skills in `.agents/skills/` enables automatic workspace discovery in Antigravity and one-line installation across all major coding agents via `npx skills add moodynooby/Course-Market`.

## Verification

- Targeted MCP tool, isolation boundary, and Streamable HTTP protocol tests (`mcp/__tests__/tools.test.ts`, `mcp/__tests__/boundary.test.ts`, `netlify/functions/__tests__/mcp.test.ts`).
- Verified `npx skills add . --list` discovers all 3 skills.
- Full non-mutating quality gate (`pnpm run lint`) and production build (`pnpm run build`).
