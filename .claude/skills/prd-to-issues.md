---
name: prd-to-issues
description: Break an approved PRD into independently-grabbable Kanban issue files using vertical slices and traceable bullets. Output is a set of markdown files in /issues/ with explicit blocking relationships.
---

# /prd-to-issues

Convert a PRD into a Kanban board of issue files.

## Inputs

- A PRD at `issues/<NNNN>-prd-<slice-name>.md` with status `APPROVED`.

## Process

1. **Read the PRD.**
2. **Propose a module map** — list the modules each issue will touch. Show the user. Wait for approval.
3. **Draft issues as vertical slices.** Every issue must touch the layers it needs to deliver visible behavior. No "all the schemas" issues, no "all the API routes" issues.
4. **Apply traceable-bullet rules**:
   - Every issue produces something that can be exercised end-to-end (even if scaffolded with hardcoded data).
   - Every issue must have at least one feedback loop (test, type-check, manual demo step).
   - Every issue declares its **test boundary** (which deep module is wrapped).
5. **Quiz the user** on any non-obvious split. Recommend then ask.
6. **Write the issue files** to `issues/<NNNN>-<short-name>.md`. Number sequentially, continuing from existing issues.

## Vertical slice rules

- **First slice rule**: the first issue in any new feature must produce something visible end-to-end, even if minimal. Schema-only issues are forbidden.
- **Two-layer minimum**: every AFK issue touches at least two of {db, service, api, ui}. Issues touching only one layer should be merged or marked HIL.
- **Deep module respect**: an issue that modifies a deep module's public interface needs an ADR.
- **Atomicity**: an issue should be reviewable as one PR. If the diff would exceed ~500 LOC, split it.

## Issue file template

```markdown
# <NNNN> — <title>

- **Status**: TODO | IN-PROGRESS | IN-REVIEW | DONE
- **Type**: AFK | HIL
- **Blocked-by**: <NNNN, NNNN> (none if standalone)
- **Blocks**: <NNNN, NNNN> (optional)
- **Slice**: <slice ID from PRD>
- **PRD**: issues/<NNNN>-prd-<slice-name>.md

## Goal
One sentence — what's true after this issue ships.

## Scope (in)
- Bullet list of changes.

## Scope (out)
- What we are NOT doing in this issue (deferred to which issue).

## Modules touched
| Module | Change |
|--------|--------|
| wallet | new method `authorize` |
| gemini-gateway | new file, exports `clientForRequest` |

## Test plan
- Failing test first: <describe>
- Test boundary: <module>
- Feedback loops to run: `pnpm test`, `pnpm typecheck`, `pnpm lint`

## Definition of done
- Tests green
- Visible demo: <steps to verify>
- No raw `<button>` / `<input>` introduced
- No `@google/genai` imports outside gemini-gateway
```

## Output

After writing all issues, print:
- A dependency graph (`X blocks Y` lines or mermaid)
- The recommended first issue to grab
- A note if any issue is HIL and why

Do NOT auto-start the Ralph loop. The user decides when.
