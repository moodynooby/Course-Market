# Contributing

Last updated: 2026-09-25

## Prerequisites

- Node.js 24
- pnpm 11.21.0
- Android Studio and Android SDK only for native work
- ShellCheck only when changing shell scripts

Use the pnpm version pinned in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm run setup:hooks
```

## Required Reading

1. `AGENTS.md`
2. `ARCHITECTURE-MAP.md`
3. `docs/documentation-standards.md`
4. Relevant documents under `docs/`

## Quality Gate

Run the complete non-mutating gate before review:

```bash
npm run lint
```

The gate runs Biome, Markdownlint, ShellCheck, TypeScript, and unit tests. Biome is pinned to `2.5.14` and handles formatting/linting for supported source files. Use the package-manager equivalent when preferred:

```bash
pnpm run lint
```

Apply intentional fixes with:

```bash
pnpm run lint:fix
```

The gate must never rewrite files. Do not bypass checks, suppress real diagnostics, or use `--no-verify`.

## Testing Rules

- Put tests at the strongest owner boundary for the behavior.
- Bug regression tests must fail before the fix for the intended reason.
- Do not duplicate the same contract at UI, hook, and service layers.
- Do not add test-only production exports or wrappers.
- Reuse existing fixtures and table-driven cases before creating new ones.
- Non-trivial logic requires one focused runnable check.

## Validation by Change Area

| Area                          | Minimum validation                                                      |
| ----------------------------- | ----------------------------------------------------------------------- |
| Frontend or shared logic      | `pnpm run typecheck` and focused Vitest tests                           |
| Netlify Functions or database | `pnpm run typecheck` and focused `netlify/` or `db/` tests              |
| Documentation/config          | Markdown/config checks and `pnpm run typecheck` when scripts change     |
| Capacitor                     | `pnpm run build:native` and `pnpm exec cap sync android`                |
| Schedule engine               | `src/utils/__tests__/schedule.test.ts` and `schedule-generator.test.ts` |

Before final review, run `npm run lint`. For user-facing changes, also smoke-test sign-in, course selection, schedule generation, trade actions, and the affected native flow.

## Git Workflow

1. Work on a feature branch.
2. Keep commits small, atomic, and Conventional Commits-style.
3. Stage explicit paths; never use `git add .` blindly.
4. Commit only when explicitly requested.
5. Never push, open a pull request, or merge without explicit permission.
6. Merge pull requests with a merge commit; never squash.

## Documentation

- Update `ARCHITECTURE-MAP.md` when architecture or contracts change.
- Update the relevant `docs/` record after completing work.
- Update `CHANGELOG.md` for release-relevant changes.
- Follow `docs/documentation-standards.md` for status and naming.
