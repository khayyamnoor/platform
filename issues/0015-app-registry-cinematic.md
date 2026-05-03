# 0015 — app-registry: static manifest with cinematic entry

- **Status**: IN-REVIEW
- **Type**: AFK
- **Blocked-by**: 0002
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
The platform has a single source of truth for which apps are mounted, with one entry: cinematic-ai-video-director.

## Scope (in)
- `packages/app-registry/src/manifest.ts`: `APPS: AppManifest[]` — read-only frozen array.
- One entry:
  ```ts
  {
    id: "cinematic-ai-video-director",
    name: "Cinematic Director",
    description: "Turn a video idea into a structured cinematographic shot list.",
    category: "Video planning",
    route: "/apps/cinematic-ai-video-director",
    status: "BETA",
    estimatedCreditsPerRun: 12, // displayed on dashboard cards
    actionsPerPlanApprox: { STARTER_30: 250, PRO_60: 583, MAX_90: 1000 } // marketing approximations
  }
  ```
- `listApps()` and `getApp(id)` read-only helpers.
- TypeScript types for `AppManifest`, `AppCategory`, `AppStatus`.

## Scope (out)
- Dynamic / DB-backed registry — never (out of scope per PRD: ratings/reviews/favorites cut).
- Per-app feature flags — not in v1.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/app-registry` | NEW (single file + types + index) |

## Test plan
- Failing tests first:
  1. `listApps()` returns exactly 1 entry.
  2. `getApp("cinematic-ai-video-director")` returns the entry.
  3. `getApp("missing")` returns `null`.
  4. Manifest is frozen — runtime mutation throws.
- Test boundary: `packages/app-registry` (pure module).

## Definition of done
- All tests green.
- Public API: `listApps`, `getApp`, plus types. Nothing else.
- README in package has instructions for adding the next app entry.
