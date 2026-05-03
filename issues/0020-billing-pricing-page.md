# 0020 — apps/web: /billing pricing page + Subscribe buttons

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0006, 0008, 0018, 0019
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
Users see plans, click Subscribe, complete Checkout, and return to the dashboard with their plan applied.

## Scope (in)
- `apps/web/app/(shell)/billing/page.tsx`: three plan cards (STARTER_30, PRO_60, MAX_90) with:
  - Price, included credit count, raw approximation ("about 250 cinematic-director runs"), feature highlights.
  - Subscribe button → server action `createCheckoutSession({ plan })` → redirect to Stripe URL.
  - Current plan callout if user is already subscribed (with "Manage subscription" link to Stripe Customer Portal).
- Success URL: `/billing/success` — shows confirmation, polls wallet for plan change (in case webhook arrival lags), redirects to `/dashboard` after confirmed.
- Cancel URL: `/billing` (returns to pricing page).
- Plan card design uses Coinbase getdesign primitives: `Card`, `Button`, `Badge`.
- Marketing approximations in cards come from `app-registry` `actionsPerPlanApprox`.

## Scope (out)
- Annual plans, coupons, multi-currency — all cut.
- In-app cancellation — link to Stripe Customer Portal.
- Promo codes — cut.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web` | + /billing route, success route, server action |
| `packages/billing` | + `createBillingPortalSession` for "Manage subscription" link |
| `packages/ui` | (used) |

## Test plan
- Failing tests first:
  1. Playwright: from /dashboard click Upgrade → /billing renders 3 plan cards.
  2. Playwright: click Subscribe on STARTER_30 → redirected to Stripe Checkout test URL.
  3. After test-mode Checkout completion → /billing/success → eventually redirects to /dashboard with plan badge updated to STARTER_30.
  4. Existing subscribed user sees "Current plan" callout and "Manage subscription" button.
  5. Component test: plan cards render in light + dark with all three plans.
- Test boundary: `apps/web` /billing routes + Stripe API mocked.

## Definition of done
- All Playwright tests green.
- Visual QA pass (light + dark) for /billing and /billing/success.
- Server actions properly authenticated.
