# 0017 — apps/web: cinematic route + useGateway hook + cost UI + toast (TRACEABLE BULLET 2)

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0006, 0008, 0013, 0016
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
A signed-in user clicks the cinematic director on the dashboard, fills the prompt, sees the live credit cost on the Generate button, clicks, and gets a structured shot list back with their balance updated and a confirmation toast. **This is the slice's second and biggest traceable bullet — it stitches every prior issue into a working product.**

## Scope (in)
- `apps/web/app/(shell)/apps/cinematic-ai-video-director/page.tsx`: a thin wrapper that imports the legacy component and mounts it inside the shell.
- `apps/web/lib/use-gateway.ts`: client hook that:
  - Returns a proxy object with `models.generateContent(req)` that POSTs to `/api/apps/cinematic-ai-video-director/run`.
  - Returns `estimate(req)` that calls `gemini-gateway.estimate` directly (pure function, safe in client).
  - Returns `state` (current wallet state) so the legacy app can know if it should show "out of credits" / "BYOK required".
- `apps/web/app/api/apps/cinematic-ai-video-director/run/route.ts`: server route that:
  - Auths via Clerk → `userId`.
  - Calls `clientForRequest({ userId, appId: 'cinematic-ai-video-director', requestId, idempotencyKey })`.
  - Returns the result, error, and updated balance.
- Generate button in the legacy app shows live cost via `useGateway().estimate()` — but **the button itself remains the legacy `<button>`** (grandfathered).
- Toast on success: `"Used N credits. M remaining."` Toast on error: shows verbatim Gemini error.
- Dashboard `Apps` grid renders `app-registry` entries with the cinematic card linking to the route.
- Disable Generate (visually + via the API rejecting) when balance < estimate.

## Scope (out)
- Cap warning banner — issue 0021.
- Cap-reached modal — issue 0022.
- Settings page — issue 0023.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web` | NEW route, hook, API route handler |
| `apps/legacy/cinematic-ai-video-director` | minor — wire button label to `useGateway().estimate()` |
| `packages/ui` | (used: Toast, Card) |
| `packages/app-registry` | (used) |

## Test plan
- Failing tests first:
  1. Playwright happy path: sign up → dashboard → click cinematic card → /apps/cinematic-ai-video-director loads with the legacy form.
  2. Playwright: type a prompt → Generate button shows "Generate (~12 credits)" updating live.
  3. Playwright: click Generate (mock the API route to return a fixture response) → toast appears with actual credits → balance pill in header updates.
  4. Component test: when wallet state is EXHAUSTED, Generate button is disabled with tooltip.
  5. API route test: rejects unauthenticated requests with 401.
  6. API route test: returns the gateway result shape on success.
- Test boundary: `apps/web` (route + hook); end-to-end Playwright covers the full bullet.

## Definition of done
- All Playwright happy-path tests green on a Vercel preview deploy.
- Generate cost visibly updates as user types in the form.
- Toast appears with correct credit usage.
- Balance pill updates without a full page reload.
- No raw `<button>` introduced in `apps/web` (only legacy `<button>` in the grandfathered package).
