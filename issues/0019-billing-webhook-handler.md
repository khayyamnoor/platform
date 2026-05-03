# 0019 — billing: webhook handler + plan→wallet sync

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0018
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
Stripe webhook events drive wallet plan changes and credit grants idempotently.

## Scope (in)
- `apps/web/app/api/webhooks/stripe/route.ts`: verifies signature with `STRIPE_WEBHOOK_SECRET`, then calls `billing.handleWebhook(event)`.
- `packages/billing/src/handleWebhook.ts`: switch on `event.type`:
  - `checkout.session.completed`: link Stripe customer ID → `userId`, set wallet `plan` from session.
  - `invoice.paid`: grant the plan's credits (3000/7000/12000), insert `ledger_entries` row (`reason: GRANT`), transition wallet state to `SUBSCRIBED_PLATFORM_KEY` (or `SUBSCRIBED_USER_KEY` if a key is already on file). **Credits granted only on payment success — not before.**
  - `invoice.payment_failed`: log + Axiom alert. Wallet unchanged.
  - `customer.subscription.updated`: handle plan changes (upgrades grant pro-rated additional credits).
  - `customer.subscription.deleted`: revert plan to `FREE`, transition state to `TRIAL` (or `EXHAUSTED` per state machine), do NOT zero out remaining credits (user can use what they have).
- Idempotency: every event passes through `billing_events` table — duplicate `event.id` → no-op.
- Test fixtures for each event type stored in `packages/billing/__fixtures__/`.

## Scope (out)
- Refunds (manual ops in v1).
- Customer.created / .deleted (Clerk webhook for user.deleted handles wallet cascade — separate post-launch issue).
- Tax / Stripe Tax — out of v1.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web` | + webhook route handler |
| `packages/billing` | + handleWebhook, fixtures |
| `packages/wallet` | + grantCredits, applyPlanChange (called by handleWebhook) |
| `packages/db` | + insert helper for billing_events |

## Test plan
- Failing tests first:
  1. Signature verification rejects bad signatures.
  2. `checkout.session.completed` for a new customer links + sets plan; `pending` state until invoice.paid.
  3. `invoice.paid` grants the right number of credits per plan.
  4. Same `event.id` delivered twice → second call is no-op (no double credit).
  5. `subscription.deleted` reverts to FREE without zeroing credits.
  6. `payment_failed` logs but does not mutate wallet.
  7. `subscription.updated` from STARTER to PRO grants the delta (4000 credits) pro-rated.
- Test boundary: `apps/web` route + `packages/billing` handler — black-box from Stripe HTTP perspective with mocked Stripe SDK.

## Definition of done
- All 7 tests green.
- Manual smoke test: complete a real test-mode Stripe Checkout flow → wallet updates correctly.
- Webhook idempotency confirmed by replaying the same event twice in tests.
