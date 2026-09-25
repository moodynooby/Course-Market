# Documentation Standards

Last updated: 2026-09-25

## Scope

These rules apply to architecture, feature, issue, and operational documents under `docs/`. Root documents (`README.md`, `AGENTS.md`, `ARCHITECTURE-MAP.md`, `CONTRIBUTING.md`, and `CHANGELOG.md`) follow the same accuracy and lifecycle principles.

## File Naming

Use:

```text
[sequence]-[YYYYMMDD]-[kebab-case-topic].md
```

Examples:

```text
0001-20260925-architecture-baseline.md
0002-20260926-schedule-cache-recovery.md
```

- Use a zero-padded, monotonically increasing sequence.
- Use the repository-local date in `YYYYMMDD`.
- Do not reuse a sequence number or rename a completed historical record to imply a different date.

## Required Header

Every `docs/` record starts with:

```markdown
# Title

- Status: proposed | in-progress | complete | superseded
- Owners: team or responsible area
- Last Updated: YYYY-MM-DD
- Related Files: `path`, `path`
```

## Status Lifecycle

```text
proposed → in-progress → complete
                     ↘ superseded
```

- `proposed`: accepted direction, implementation not started.
- `in-progress`: implementation or investigation is active.
- `complete`: implemented and verified.
- `superseded`: retained for history and linked to its replacement.

Do not mark a record complete until the required validation has run.

## Content Rules

- Record decisions, ownership, constraints, and observable outcomes.
- Link to concrete files and contracts rather than duplicating source code.
- Keep architecture truth in `ARCHITECTURE-MAP.md`; link instead of copying it.
- Do not record plans as completed facts.
- Remove temporary notes when the record reaches `complete`, unless they explain durable rationale.

## Update Requirements

After a task:

1. Update the existing record that owns the changed behavior.
2. If no record exists, create one using the naming and header rules.
3. Update `ARCHITECTURE-MAP.md` when ownership, dependencies, hot spots, or contracts change.
4. Update `CHANGELOG.md` for release-relevant behavior, tooling, or architecture changes.
5. Run Markdownlint and Prettier checks for documentation changes.
