# Design System

**Source of truth**: [getdesign](https://getdesign.dev) Coinbase preset.

## How to add a component

```bash
npx getdesign@latest add coinbase <component-name>
```

This shells out a copy-pasted, owned-by-us version of the component into our codebase (typically `app-shell/components/ui/<name>.tsx`). We do not depend on `getdesign` at runtime.

Use the `/add-coinbase-component` skill when adding multiple components.

## Components we expect to use (v1)

> Confirm during grill which of these are needed for the wedge slice.

- `Button` — primary, secondary, ghost, destructive variants
- `Input` — text, email, password
- `Textarea`
- `Card`
- `Badge` — for plan / status
- `Tabs`
- `Modal` / `Dialog`
- `Toast` — notifications
- `DropdownMenu`
- `Avatar`
- `Progress` — credit bar, video gen progress
- `Tooltip`
- `Skeleton` — loading states
- `Table` — billing history, usage table

## Hard rules

1. **No raw HTML form controls in app code.** No `<button>`, `<input>`, `<select>`. Always import from our `ui/` folder.
2. **No inline hex colors.** Use design tokens (`var(--color-foreground)` etc).
3. **No ad-hoc spacing.** Tailwind spacing scale only (`p-2`, `p-4`, etc), no `style={{padding: '13px'}}`.
4. **Raw Tailwind only inside `ui/` wrappers.** App code composes our wrappers; it does not reach into Tailwind for layout decisions that belong to the design system.
5. **Light + dark in lockstep.** Every component must work in both. CI lints for hardcoded colors.

## Scope of these rules

These rules apply to:
- `apps/web/**` (the Next.js shell — header, dashboard, settings, billing, etc.)
- `packages/**` (deep modules and their UI surfaces)

They are **grandfathered** in:
- `apps/legacy/**` — ported legacy apps that still use their original Tailwind/JSX. Each legacy app gets its own "port to getdesign" slice later. Until that slice runs for a given app, the legacy code lives unmolested by these rules.

The boundary is enforced by lint scope, not by trust. Add a Biome / ESLint override for `apps/legacy/**` when wiring CI.

## Tokens

> Pulled from getdesign Coinbase preset on first install. Documented here for ADR purposes — do not edit by hand; re-run getdesign and re-reconcile.

```
--color-background
--color-foreground
--color-muted
--color-muted-foreground
--color-primary           ← Coinbase blue
--color-primary-foreground
--color-destructive
--color-success
--color-warning
--color-border
--color-ring

--radius-sm | --radius-md | --radius-lg
```

## Lint rules to add (issue: design-lint-setup)

- ESLint rule: ban raw `<button>` / `<input>` / `<select>` / `<a>` (require import from `ui/`).
- Stylelint: ban inline color hex in `.tsx`. Ban Tailwind arbitrary values for color (`text-[#...]`).
- Storybook (or LADLE) per component, with light + dark variants captured.

## Visual review

- Every UI-touching PR includes a screenshot in PR body (light + dark).
- New apps live behind a feature flag until manual visual QA passes.
