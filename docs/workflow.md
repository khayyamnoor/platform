# Workflow — How We Work With AI

This document is the playbook. Future Claude sessions read this file and `CLAUDE.md` and immediately know how we operate. It is adapted from Matt Pocock's "Software Engineering Fundamentals With AI" workshop.

## The two constraints we work around

1. **Smart zone vs dumb zone.** LLM quality drops sharply past ~100K tokens. Plan tasks to fit. Prefer `/clear` over compact.
2. **Memento problem.** LLMs forget between sessions. Anything load-bearing must live on disk: `/docs`, `/issues`, `/.claude/skills`.

## The end-to-end loop

```
  ┌─────┐    ┌──────────┐    ┌─────┐    ┌────────────┐    ┌──────┐    ┌────┐
  │ Idea│───►│ Grill Me │───►│ PRD │───►│ Kanban     │───►│Ralph │───►│ QA │
  │     │    │ (HIL)    │    │(HIL)│    │ Issues(HIL)│    │(AFK) │    │(HIL)│
  └─────┘    └──────────┘    └─────┘    └────────────┘    └──┬───┘    └──┬─┘
     ▲                                                        │           │
     └────── new issues filed during QA ──────────────────────┘           │
     │                                                                    │
     └────────────────────────────── slice complete ─────────────────────┘
```

- **Idea** — vague vision (a Slack message, a Linear ticket, a paragraph from the founder).
- **Grill Me** — invoke `/grill-me` with the idea. One question at a time, each with a recommended answer. End: shared design concept on disk.
- **PRD** — invoke `/write-prd`. Destination doc for **one vertical slice**, not the whole platform. Includes user stories, out-of-scope, test boundaries.
- **Kanban Issues** — invoke `/prd-to-issues`. Breaks the PRD into independently grabbable markdown files in `/issues/`. Each issue tags `blocked-by`, `type: AFK | HIL`.
- **Ralph (AFK)** — `scripts/ralph-once.sh` runs the implementer loop: pick next unblocked AFK issue → red → green → refactor → run feedback loops → commit. Use `ralph-loop.sh` for parallel.
- **QA (HIL)** — human drives the slice in a browser. Files defects as new issues. Once green, close issues by moving to `/issues/closed/`.

## Vertical slices, not horizontal layers

Bad: "Phase 1 — all schemas. Phase 2 — all APIs. Phase 3 — all UI."
Good: "Sign up → buy a plan → run the logo-ideator → see credit balance update."

A vertical slice gives **end-to-end feedback** by end-of-slice. Horizontal phases leave you blind until the third phase merges.

## Deep modules, not shallow ones

Each module exposes a small interface and hides a lot of implementation. Test boundaries wrap the **interface**, not every internal function. See `architecture.md` for the platform's deep module map.

If a file passes 300 LOC, write an ADR explaining why it shouldn't be split.

## Push vs pull context

| Type | Examples | Why |
|------|----------|-----|
| **Push** (always loaded) | `CLAUDE.md` | Hard rules that must apply to every prompt. Keep tiny. |
| **Pull** (on demand) | `.claude/skills/*`, `docs/*` | Skills are invoked by name. Docs are referenced when relevant. |

When adding a rule, default to **pull**. Push is expensive — every session reads it.

## The two-agent implementation pattern

For each issue:
1. **Implementer** (Sonnet): writes code, follows TDD, can pull from skills as needed.
2. **Reviewer** (Opus, fresh context): standards pushed in, reviews the diff before human sees it.

Splitting them keeps the reviewer in the smart zone — a context that just spent 60K tokens implementing reviews badly.

## Rules of thumb

- **No code without an issue.** If you find yourself wanting to "just quickly fix" something, write an issue.
- **TDD always.** Failing test first. No "I'll add tests later."
- **Don't keep stale PRDs.** Once a slice ships, close the issue (move to `/issues/closed/`). Stale docs cause doc-rot.
- **QA is the human's job.** AI can run automated checks; only a human catches taste.
- **`/clear` over `/compact`.** Compaction sediment makes the next round dumber. Hand off via files, not via summaries.

## Skills index

| Skill | When to use |
|-------|-------------|
| `/grill-me` | Before starting any feature or planning session. |
| `/write-prd` | After grilling, to produce a destination doc for one slice. |
| `/prd-to-issues` | After a PRD is approved, to produce vertical-slice issues. |
| `/ralph-implementer` | Inside `scripts/ralph-once.sh`; do not invoke directly. |
| `/ralph-reviewer` | Auto-run after the implementer commits. |
| `/improve-architecture` | Periodically, to find shallow modules to deepen. |
| `/deep-module-check` | Before merging a PR, to verify the new module fits our deep-module rules. |
| `/add-coinbase-component` | When you need a new UI primitive — wraps `npx getdesign`. |
