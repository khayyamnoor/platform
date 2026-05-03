# 0026 — Visual QA pass + slice signoff

- **Status**: TODO
- **Type**: HIL
- **Blocked-by**: 0025
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Why HIL
Only a human can judge taste. Automated tests verify behavior, not feel. This is the final gate before slice 1 is closed.

## Goal
Operator runs through the slice manually in light + dark, captures screenshots, fixes any visual or UX defects discovered, and signs off.

## Scope (in)
- Manual run-through of every user story from the PRD (1–12).
- For each, capture screenshots in light + dark.
- File any defects as new issues with `Type: AFK` and `Blocked-by: <originating issue>`.
- Once defects are resolved, mark this issue DONE.
- Update `docs/architecture.md` module map: change every shipped module's status from PROPOSED → SHIPPED.
- Move slice PRD `0001-prd-wedge-cinematic-director.md` to `issues/closed/`.
- Move all slice issues (0002–0025) to `issues/closed/`.
- Tag the commit `wedge-v1`.

## Scope (out)
- Cross-browser testing — out of v1.
- Mobile viewport — out of v1.
- A11y audit — file as a follow-up issue if defects found, don't block slice.

## Modules touched
| Module | Change |
|--------|--------|
| Documentation | architecture.md status updates |
| `issues/` | move all closed issues to `closed/` |

## Test plan
- The slice IS the test. No new automated tests added in this issue.
- Defect issues filed, if any, follow normal Ralph cycle.

## Definition of done
- All 12 user stories visually verified in light + dark.
- Screenshots posted as a comment on this issue (or in a post-launch retro doc).
- All defect issues filed, implemented, and closed.
- All slice issues moved to `closed/`.
- Tag `wedge-v1` cut.
- Slack message / email to whoever cares: "Slice 1 shipped."
