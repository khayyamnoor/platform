# @platform/app-registry

Static manifest of platform-mounted apps. Single source of truth for which apps the dashboard renders, what their routes are, and the marketing-page approximations.

## Public API

```ts
import { listApps, getApp, type AppManifest } from "@platform/app-registry";

listApps();                            // → readonly AppManifest[]
getApp("cinematic-ai-video-director"); // → AppManifest | null
```

That's it. No mutation helpers, no DB. The manifest is frozen at module load.

## Adding a new app

1. Open `src/manifest.ts`.
2. Append a new `Object.freeze({...})` entry to the `APPS` array. Required fields:
   ```ts
   {
     id: "kebab-case-id",            // also used in URLs and ledger refs
     name: "Display Name",
     description: "One-liner shown on the dashboard card.",
     category: "Video planning",     // add to AppCategory if new
     route: "/apps/kebab-case-id",   // must match `/apps/${string}`
     status: "BETA",                 // or "STABLE"
     estimatedCreditsPerRun: 12,
     actionsPerPlanApprox: { STARTER_30: 250, PRO_60: 583, MAX_90: 1000 },
   }
   ```
3. If your app introduces a new category or status, add the literal to `src/types.ts` (`AppCategory` / `AppStatus`).
4. Update `manifest.test.ts` — the count assertion needs to bump from 1 to 2.
5. The dashboard, route mounting, and per-app pricing approximations all read from the registry — no other wiring changes required.

## What this package is *not*

- Not a DB-backed registry. PRD explicitly cuts ratings, reviews, favorites.
- Not a feature-flag store. v1 has no per-app flags.
- Not a place for runtime app config (env vars, secrets, etc.). Those live in `apps/web` env.
