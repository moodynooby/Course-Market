# Agent Instructions

## Source of Truth

Read before acting; do not assume repository structure or conventions:

- [ARCHITECTURE-MAP.md](ARCHITECTURE-MAP.md) — System boundaries, dependencies, hot spots, anti-regression contracts.
- [DESIGN.md](DESIGN.md) — Visual identity, UI tokens, 12px geometry, styling standards.
- [CONTRIBUTING.md](CONTRIBUTING.md) — Git workflow, branch discipline, commit rules, and quality gates.
- [docs/documentation-standards.md](docs/documentation-standards.md) — Documentation lifecycle and CHANGELOG standards.

## Operating Principles

- **Minimal Blast Radius:** Touch only code directly relevant to the task. Never refactor, reformat, or "clean up" adjacent code unasked.
- **YAGNI & Reuse First:** Search the codebase and consult [ARCHITECTURE-MAP.md](ARCHITECTURE-MAP.md) before writing new utilities, hooks, or components.
- **Explicit over Clever:** Prioritize readability, clarity, and edge-case correctness over brevity or golfed one-liners.
- **Sub-Agent Discipline:** Execute standard tasks directly. Delegate to sub-agents only for wide codebase searches or parallel verification.
- **Diagnostics Integrity:** Never silently suppress type errors, linter warnings, or failing tests. Fix root causes across all callers.

## Execution Lifecycle

Follow this sequential loop for every task:

1. **Inspect:** Check current file state and `git status`. Do not discard or overwrite uncommitted changes without explicit user instruction.
2. **Trace:** Trace data and dependency flows across architectural boundaries before editing.
3. **Edit Surgically:** Apply minimal, focused edits matching existing code patterns.
4. **Verify (Tiered):**
   - *Iteration:* Run targeted unit tests (`pnpm exec vitest run <path>`) and typecheck (`pnpm run typecheck`).
   - *Completion Gate:* Run `pnpm run lint` (Biome, Markdownlint, ShellCheck, TypeScript, full tests). Must exit 0.
   - *Autofixes:* Use `pnpm run lint:fix` only when rewriting supported files is intentional.
5. **Document:** Update the owning record in `docs/` (or create a new one following [docs/documentation-standards.md](docs/documentation-standards.md)) and update `CHANGELOG.md` when release-relevant.

## Hard Constraints

- Never push, open a PR, or merge without explicit user permission.
- Commit only when explicitly requested; keep commits atomic with Conventional Commits.
- Never squash merge (`gh pr merge --merge` only).
- Never bypass pre-commit hooks or quality gates (`--no-verify` is prohibited).
- Use `pnpm` exclusively for package management and scripts.
