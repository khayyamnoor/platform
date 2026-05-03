# 0006 — ui package: Coinbase getdesign primitives

- **Status**: IN-PROGRESS
- **Type**: HIL
- **Blocked-by**: 0002
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Why HIL

`npx getdesign@latest add coinbase <name>` may need interactive confirmation, hits the network, and produces files that should be visually spot-checked before being committed. The `/add-coinbase-component` skill handles each install but a human runs the batch and verifies.

## Goal
The 12 v1 components from the PRD's design-system section are installed, indexed, and rendered correctly in light + dark.

## Scope (in)
- Run for each component, in order: `Button`, `Input`, `Textarea`, `Card`, `Badge`, `Modal`, `Toast`, `DropdownMenu`, `Avatar`, `Progress`, `Tooltip`, `Skeleton`.
- Use `/add-coinbase-component` skill for each install.
- `packages/ui/src/index.ts` re-exports every component.
- A Storybook (or Ladle) workspace shows each component in light + dark.
- Update `docs/design-system.md` "Components installed" section with names + versions + date.
- Tokens reconciled — `globals.css` and Tailwind config in `apps/web` import them.

## Scope (out)
- Any custom styling beyond what getdesign provides.
- App-shell layout — separate issue (0008).

## Modules touched
| Module | Change |
|--------|--------|
| `packages/ui` | NEW components (12) + barrel index |
| `apps/web/app/globals.css` | imports getdesign tokens |
| `docs/design-system.md` | updated Components-installed section |

## Test plan
- Failing test first: import each component in a smoke test that mounts it (`@testing-library/react`) and asserts it renders without throwing.
- Visual verification (manual): screenshot Storybook in both themes — paste into PR body.
- Test boundary: `packages/ui`.

## Definition of done
- All 12 components importable from `@platform/ui`.
- Mount tests green.
- Storybook stories exist for each.
- Light + dark screenshots in PR body.
- No raw HTML form controls used internally that aren't part of the component's intended API.
