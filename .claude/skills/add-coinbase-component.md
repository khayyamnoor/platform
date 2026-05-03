---
name: add-coinbase-component
description: Add a Coinbase getdesign UI primitive to the codebase. Wraps `npx getdesign@latest add coinbase <name>` and registers the new component in our ui/ index.
---

# /add-coinbase-component

Add one or more Coinbase-themed UI primitives.

## Inputs

- Component name(s) — e.g. `button`, `dialog`, `tabs`. Multiple OK.

## Process

1. **Confirm not already installed.** Check `app-shell/components/ui/`. If exists → ask user if they want to overwrite (default: no).
2. **Run the install**: `npx getdesign@latest add coinbase <name>` from the app-shell package root. Capture output.
3. **Verify install succeeded.** New file should be at `app-shell/components/ui/<name>.tsx`.
4. **Reconcile tokens.** If the install dropped or modified design tokens (`globals.css`, `tailwind.config.*`), diff against the previous version and surface changes in a "Token reconciliation" section to the user.
5. **Register in the barrel.** Add an export to `app-shell/components/ui/index.ts`:
   ```ts
   export * from "./<name>";
   ```
6. **Add to `docs/design-system.md`** — under "Components installed", add a row with name + version + date.
7. **Smoke test.** If a Storybook story (or test fixture) is generated, run it. If not, write a minimal one — at least visual mounting in light + dark.
8. **Output**:
   ```
   COMPONENT_INSTALLED: <name>
   Files: <list>
   Token changes: none | <summary>
   Next steps: <import path to use>
   ```

## Hard rules

- **Never edit the installed file in the same operation.** If you need to customize, file a follow-up issue.
- **Never write a "shim" that re-exports a raw HTML element with a different name.** That defeats the design system. Use real getdesign components.
- **Tokens are source-of-truth.** If a token is missing, run getdesign to pull it in — don't hand-edit.

## Failure modes

- `npx` fails (network, registry) → surface error, don't fall back to hand-rolling.
- Component doesn't exist in coinbase preset → tell the user, suggest the closest match.
- Install overwrites a customized component → STOP and ask. Customization may have been intentional.
