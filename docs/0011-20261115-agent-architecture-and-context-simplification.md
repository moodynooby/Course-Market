# Agent Architecture and Context Simplification

- Status: complete
- Owners: Architecture, Tooling & Agent Systems
- Last Updated: 2026-11-15
- Related Files: `AGENTS.md`, `CONTRIBUTING.md`, `docs/documentation-standards.md`, `CHANGELOG.md`

## Context & Motivation

As AI coding agents become the primary contributors to the codebase, agent instruction files (`AGENTS.md`) serve as system prompts injected into context windows on every turn. An audit revealed several anti-patterns:

1. **Context Bloat & Low Density:** Redundant restatement of Git workflows, CI commands, and architectural platitudes consumed excessive tokens, penalizing models with smaller context windows.
2. **Conflicting Directives:** Philosophical statements such as *"Can this be one line? Make it one line"* directly clashed with clarity directives like *"Readability: explicit and obvious over clever"*.
3. **Persona Hazards:** Prompts prescribing persona roleplay (*"Act as a lazy, elite senior developer"*) caused semantic bleed and license for incomplete code generation.
4. **Unconditional Delegation:** Broad subagent instructions encouraged over-orchestration and quota depletion on simple tasks.
5. **Instruction Drift:** Stale references to removed subsystems (such as Capacitor in `CONTRIBUTING.md` and Prettier in `docs/documentation-standards.md`) created conflicting sources of truth.

## Key Changes

1. **Streamlined `AGENTS.md`:**
   - Reduced token footprint by over 50% while increasing actionable instruction density.
   - Removed persona roleplay and contradictory one-liner rules in favor of explicit engineering principles (Minimal Blast Radius, YAGNI, Explicit over Clever).
   - Codified subagent discipline: delegate only for wide exploration or parallel verification; execute standard workflows directly.
   - Formalized a 5-step Execution Lifecycle (`Inspect` → `Trace` → `Edit Surgically` → `Verify` → `Document`).
   - Implemented a tiered verification ladder (targeted vitest/typecheck during iteration; full `pnpm run lint` before completion).

2. **Cleaned Supporting Contracts:**
   - **`CONTRIBUTING.md`**: Removed dead Capacitor build instructions, Android Studio prerequisites, and native smoke-test steps left over from the Capacitor removal. Standardized quality gate commands on `pnpm`.
   - **`docs/documentation-standards.md`**: Replaced legacy Prettier reference with Biome.

## Verification

- **Linting & Formatting:** Validated with `pnpm run lint:biome` and `pnpm run lint:markdown`.
- **Quality Gate:** Ran full non-mutating suite `pnpm run lint`.
