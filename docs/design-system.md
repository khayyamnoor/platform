# Design System

**Source of truth**: [getdesign](https://getdesign.md) Coinbase preset → [shadcn-ui](https://ui.shadcn.com) component patterns, themed to those tokens.

## Toolchain reality (≠ original 0006 plan)

`npx getdesign@latest add coinbase` produces a single **`DESIGN.md`** describing the brand's tokens, typography, spacing, and component patterns — for an AI coding agent or designer to read as context. It does **not** install per-component React files. Filed under `packages/ui/DESIGN.md`.

For the actual component implementations we use **shadcn-ui's pattern** (Radix primitives + Tailwind + CVA) — copy-pasted, owned-by-us sources that live at `packages/ui/src/components/<name>.tsx`. Each component reads tokens from `packages/ui/src/styles.css` (a Tailwind v4 `@theme` block translated from `DESIGN.md`).

> Earlier copies of this doc described `npx getdesign … add coinbase <component-name>` as if it scaffolded `<name>.tsx`. That was incorrect — corrected on 2026-05-03 in commit shipping issue 0006.

## How to add a component

```bash
# 1. Refresh the brand spec if needed (rare — only on getdesign updates)
cd packages/ui && npx getdesign@latest add coinbase --force

# 2. Add the component
#    - Copy the closest shadcn/ui source from https://ui.shadcn.com
#    - Drop it under packages/ui/src/components/<name>.tsx
#    - Replace tailwind class colours with the CSS-variable form (e.g.
#      `bg-primary` → `bg-[var(--color-primary)]`)
#    - Add a re-export to packages/ui/src/index.ts
#    - Add a mount test in packages/ui/src/components/components.test.tsx
```

The `/add-coinbase-component` skill no longer matches the toolchain — slated for replacement in a follow-up issue.

## Components installed (v1)

| name | source | installed | notes |
|---|---|---|---|
| `Button` | shadcn-ui · Radix Slot + CVA | 2026-05-03 | 5 variants × 4 sizes |
| `Input` | shadcn-ui | 2026-05-03 | |
| `Textarea` | shadcn-ui | 2026-05-03 | |
| `Card` (+ Header/Title/Description/Content/Footer) | shadcn-ui | 2026-05-03 | |
| `Badge` | shadcn-ui · CVA | 2026-05-03 | neutral / primary / up / down / warning |
| `Modal` | shadcn-ui · `@radix-ui/react-dialog` | 2026-05-03 | exported as `Modal*` for clarity over `Dialog*` |
| `Toast` | shadcn-ui · `@radix-ui/react-toast` | 2026-05-03 | default / destructive / success |
| `DropdownMenu` | shadcn-ui · `@radix-ui/react-dropdown-menu` | 2026-05-03 | full surface (sub, radio, checkbox, separator, label) |
| `Avatar` | shadcn-ui · `@radix-ui/react-avatar` | 2026-05-03 | image + fallback |
| `Progress` | shadcn-ui · `@radix-ui/react-progress` | 2026-05-03 | for credit bars + gen progress |
| `Tooltip` | shadcn-ui · `@radix-ui/react-tooltip` | 2026-05-03 | |
| `Skeleton` | shadcn-ui | 2026-05-03 | |

Tabs and Table from the PRD's "expected" list are deferred — first wedge doesn't use them.

## Hard rules

1. **No raw HTML form controls in app code.** No `<button>`, `<input>`, `<select>`. Always import from `@platform/ui`.
2. **No inline hex colors.** Use design tokens (`var(--color-primary)` etc.) read from `packages/ui/src/styles.css`.
3. **No ad-hoc spacing.** Tailwind spacing scale only (`p-2`, `p-4`, etc), no `style={{padding: '13px'}}`.
4. **Raw Tailwind only inside `packages/ui/src/components/*` wrappers.** App code composes our wrappers; it does not reach into Tailwind for layout decisions that belong to the design system.
5. **Light + dark in lockstep.** Every component must work in both. (Dark-mode token overrides land with issue 0008's app shell.)

## Scope of these rules

These rules apply to:

- `apps/web/**` (the Next.js shell — header, dashboard, settings, billing, etc.)
- `packages/**` (deep modules and their UI surfaces)

They are **grandfathered** in:

- `apps/legacy/**` — ported legacy apps that still use their original Tailwind/JSX. Each legacy app gets its own "port to getdesign" slice later. Biome override at the repo root applies the relaxed config.

## Tokens

Pulled from `packages/ui/DESIGN.md` on first install. Translated into the Tailwind v4 `@theme` block at `packages/ui/src/styles.css`. Do not edit token values by hand — re-run `getdesign add coinbase` and re-reconcile.

```
--color-primary             #0052ff
--color-primary-active      #003ecc
--color-primary-disabled    #a8b8cc
--color-ink                 #0a0b0d   (foreground on light surfaces)
--color-body                #5b616e
--color-muted               #7c828a
--color-hairline            #dee1e6   (dividers, borders)
--color-canvas              #ffffff
--color-surface-soft        #f7f7f7
--color-surface-card        #ffffff
--color-surface-strong      #eef0f3   (elevated panels)
--color-surface-dark        #0a0b0d   (editorial heroes, full-bleed dark)
--color-surface-dark-elevated #16181c
--color-on-primary          #ffffff
--color-semantic-up         #05b169   (markets up / success)
--color-semantic-down       #cf202f   (markets down / destructive)
--color-accent-yellow       #f4b000   (warnings / highlights)

--radius-sm | --radius-md | --radius-lg
--font-display | --font-sans | --font-mono
```

## Lint rules to add (follow-up)

- Biome rule: ban raw `<button>` / `<input>` / `<select>` / `<a>` outside `packages/ui/**` and `apps/legacy/**`. Filed as issue follow-up.
- Stylelint: ban inline color hex in `.tsx` and Tailwind arbitrary colour values (`text-[#…]`). Filed as issue follow-up.
- Storybook (or Ladle) — deferred until visual QA in issue 0026.

## Visual review

- Every UI-touching PR includes a screenshot in PR body (light + dark) once the dashboard shell (0008) is up.
- New apps live behind a feature flag until manual visual QA (0026) passes.
