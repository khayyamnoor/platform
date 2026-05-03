# 0008 — Dashboard shell + credit-balance pill (FIRST TRACEABLE BULLET)

- **Status**: IN-REVIEW
- **Type**: AFK
- **Blocked-by**: 0006, 0007, 0009
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
A signed-in user lands on `/dashboard` and sees the Coinbase-themed shell with their plan badge, credit balance pill, and an empty "Apps" section. **This is the slice's first vertical traceable bullet — it crosses auth, db, ui.**

## Scope (in)
- `apps/web/app/(shell)/layout.tsx`: shared shell layout — Coinbase header (logo, nav, plan badge, credit pill, avatar dropdown).
- Header reads wallet via `getWallet(userId)` from `packages/db` and renders:
  - Plan badge (`Badge` component) showing `FREE` / `STARTER_30` / `PRO_60` / `MAX_90`.
  - Credit pill with current balance (`X credits`).
  - Avatar dropdown with "Settings" and "Sign out".
- `apps/web/app/(shell)/dashboard/page.tsx`: empty Apps grid with placeholder text "No apps yet — slice 1 will land cinematic-ai-video-director here."
- On first sign-in (no wallet exists yet): server action provisions a wallet with `plan=FREE`, `state=TRIAL`, `credits_remaining=1000`.
- Light + dark both work.

## Scope (out)
- Real wallet authorize/commit logic — issue 0010.
- Real apps in the grid — issue 0017 lands the cinematic director route.
- Settings page — issue 0023.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web` | NEW shell layout + dashboard page + wallet provisioning server action |
| `packages/db` | + `createWallet({userId, plan, state, credits_remaining})` mutation helper |
| `packages/ui` | (used, not modified) |

## Test plan
- Failing test first: a Playwright test that signs up a new user and asserts the credit pill shows "1000 credits" and the badge shows "FREE".
- Component test: header renders all elements in both themes.
- Test boundary: `apps/web` shell layout.

## Definition of done
- New signups land on `/dashboard` with 1000 free credits visible.
- Existing signed-in users see their wallet state.
- Light + dark screenshots in PR body.
- No raw `<button>` / `<input>` introduced.
