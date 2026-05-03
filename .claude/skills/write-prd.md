---
name: write-prd
description: Produce a Product Requirements Document for a single vertical slice. Run AFTER /grill-me. Output is the destination doc that drives /prd-to-issues. Do NOT write a platform-wide PRD — write per slice.
---

# /write-prd

Produce a destination document for one vertical slice.

## Inputs

- A grilling transcript at `docs/decisions/<NNNN>-*-grill.md`. If absent, refuse and tell the user to grill first.
- A target slice scope (the user names which slice this PRD is for).

## Process

1. **Locate the grilling transcript** for the relevant topic.
2. **Explore the affected code** — list the deep modules this slice touches. If unsure, ask. Output: a "Modules affected" section that lists each module and the type of change (NEW / MODIFY / NO-OP).
3. **Quiz the user** for any remaining gaps. Same one-question-at-a-time rule as `/grill-me` — usually 3–5 questions max here, not the full grill.
4. **Draft the PRD** to disk at `issues/<NNNN>-prd-<slice-name>.md`. Use the template below.
5. **Stop.** Do not auto-trigger `/prd-to-issues`. The user reviews the modules-affected list and approves.

## PRD template

```markdown
# PRD: <slice name>

- **Slice ID**: <short-id, e.g. wedge-1-logo-ideator>
- **Status**: DRAFT | APPROVED | IN-PROGRESS | SHIPPED | CLOSED
- **Created**: YYYY-MM-DD
- **Source grill**: docs/decisions/<NNNN>-*-grill.md

## Problem statement
What's broken / missing today, in user terms.

## Solution summary
One paragraph. The slice's traceable bullet through every layer.

## Modules affected
| Module | Change | Notes |
|--------|--------|-------|
| auth | NO-OP | already done |
| wallet | NEW interface: authorize/commit/rollback | |
| gemini-gateway | NEW | wraps @google/genai |
| ... | | |

## User stories
- As a **<role>**, I can **<action>** so that **<outcome>**.
- ...

## Out of scope
- Explicitly NOT doing X (defer to slice 2)
- ...

## Implementation decisions (from grill)
- Decision X → resolved as Y. Source: grill Q3.
- ...

## Test boundaries
- `wallet`: unit tests for ledger invariants, integration test for full authorize/commit cycle
- `gemini-gateway`: integration test with mocked Gemini HTTP, asserting wallet side-effects
- End-to-end: one Playwright happy path

## Definition of done
- All user stories demonstrable in browser
- All test boundaries passing in CI
- Reviewed by <reviewer>
- Visual QA pass on light + dark
- ADRs filed for any decisions hitting the ADR criteria
```

## Rules

- **One slice = one PRD.** Don't smuggle two slices in.
- **Never re-litigate decisions** that were resolved in the grill — cite them.
- **Do not read the PRD back to the user.** They trust you summarized correctly. They review by glancing.
- **Out-of-scope is mandatory.** A PRD without an out-of-scope section will scope-creep.
- **Keep it under 200 lines.** A long PRD signals the slice is too big — push for a smaller slice.
