# Platform — Operating Rules

This file is push-context: it is loaded into every Claude session. Keep it short.

## Hard rules

1. **No code without an issue.** Every code change must reference an issue file in `/issues/`. If no issue exists, write one (or invoke `/prd-to-issues`) before coding.
2. **TDD always.** Write a failing test first. Red → green → refactor. No exceptions for "small" changes.
3. **One Gemini chokepoint.** No app code imports `@google/genai` directly. All Gemini calls route through the `gemini-gateway` deep module. Violations are reverted on sight.
4. **Coinbase getdesign UI only.** Add components via `npx getdesign@latest add coinbase <name>`. No raw `<button>`, no inline hex, no ad-hoc spacing. Raw Tailwind only inside getdesign-wrapped components.
5. **Deep modules.** New modules expose a small interface. Files >300 LOC require an ADR in `docs/decisions/`.
6. **Vertical slices.** Issues must cross all relevant layers (db → service → api → ui). No "phase-1: all the schemas" issues.
7. **Don't edit `Apps/*`.** The 12 legacy apps are read-only references until explicitly ported.
8. **`apps/legacy/*` exception.** Once an app is ported into `apps/legacy/<id>/` via wrap-first, rules 3 (gemini-gateway chokepoint) still apply, but rules 4 (Coinbase getdesign UI) and the "no raw `<button>`" rule are **grandfathered until that app's per-app UI port slice runs**. The exception scope is exactly `apps/legacy/**` — `apps/web/**` and `packages/**` follow all rules.

## Workflow

When in doubt, follow `docs/workflow.md`:
- `/grill-me` before any planning
- `/write-prd` only after grilling
- `/prd-to-issues` to break PRD into vertical slices
- `scripts/ralph-once.sh` to implement one issue AFK

## Skills (pull-on-demand)

See `.claude/skills/`. Invoke by name, not by quoting the file.

## What this file is NOT

Not architecture (see `docs/architecture.md`). Not pricing logic (see `docs/pricing-model.md`). Not the design system (see `docs/design-system.md`). Keep this file under 40 lines — push tokens are the most expensive ones.
