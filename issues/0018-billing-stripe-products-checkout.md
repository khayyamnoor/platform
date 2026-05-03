# 0018 — billing: Stripe products + createCheckoutSession + ADR

- **Status**: TODO
- **Type**: HIL
- **Blocked-by**: 0010
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Why HIL
Operator must (a) create a Stripe account if not present, (b) get test-mode keys, (c) run the products bootstrap script. Then the integration is AFK.

## Scope (in)
- ADR `docs/decisions/0003-stripe-test-mode-v1.md` documenting the test-mode-first decision and switch-to-live procedure (1 ENV var + 1 Stripe Dashboard action).
- `packages/billing/scripts/bootstrap-products.ts`: idempotent script that creates the three Stripe Products + recurring monthly Prices: STARTER_30 ($30), PRO_60 ($60), MAX_90 ($90). Outputs `STRIPE_PRICE_STARTER_30`, `STRIPE_PRICE_PRO_60`, `STRIPE_PRICE_MAX_90` env values for the operator to paste.
- `packages/billing/src/checkout.ts`: `createCheckoutSession({ userId, plan }): Promise<CheckoutUrl>`.
  - Looks up Stripe customer for `userId` (creates one if absent).
  - Creates a Stripe Checkout session with the right Price ID, success/cancel URLs.
  - Stores `userId` in `client_reference_id` and `metadata.userId` for webhook reconciliation.
- `.env.example` entries: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## Scope (out)
- Webhook handling — issue 0019.
- Subscription cancel UI — out of v1 (link to Stripe Customer Portal).
- Plan upgrades/downgrades in-app — out of v1.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/billing` | NEW — checkout + bootstrap script |
| `docs/decisions/0003-stripe-test-mode-v1.md` | NEW |
| `.env.example` | + 5 Stripe vars |

## Test plan
- Failing tests first:
  1. `bootstrap-products` is idempotent: running twice does not create duplicates.
  2. `createCheckoutSession` for a user without a Stripe customer creates one, stores customer ID on the wallet (or in a side table — pick one).
  3. `createCheckoutSession` for a known user reuses the customer.
  4. URL returned is a valid Stripe Checkout URL.
- Test boundary: `packages/billing` with Stripe API mocked at HTTP layer.

## Definition of done
- ADR 0003 filed.
- Bootstrap script run successfully against test-mode Stripe (operator pastes price IDs into `.env`).
- Tests green.
- Documentation in `packages/billing/README.md` with operator setup steps.
