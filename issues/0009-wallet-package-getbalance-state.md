# 0009 — wallet package: getBalance + state machine types

- **Status**: IN-REVIEW
- **Type**: AFK
- **Blocked-by**: 0004
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
The `wallet` package exists with read-side surface and the BYOK state machine encoded as types + a pure transition function.

## Scope (in)
- `packages/wallet/src/types.ts` defines: `WalletState`, `Plan`, `WalletStateTransition` (pure function: `(state, event) => state`).
- `packages/wallet/src/getBalance.ts`: `getBalance(db, userId): Promise<{credits, plan, state, lifetimePlatformKeyCredits, byokKeyPresent}>`.
- `packages/wallet/src/transition.ts`: pure function `transition(currentState, event)` covering:
  - `SUBSCRIBE_PAID` → TRIAL → SUBSCRIBED_PLATFORM_KEY
  - `BYOK_KEY_ADDED` → SUBSCRIBED_PLATFORM_KEY → SUBSCRIBED_USER_KEY (also EXHAUSTED → SUBSCRIBED_USER_KEY)
  - `BYOK_KEY_REMOVED` → SUBSCRIBED_USER_KEY → SUBSCRIBED_PLATFORM_KEY (or EXHAUSTED if cap already hit)
  - `PLATFORM_CAP_REACHED` → SUBSCRIBED_PLATFORM_KEY → EXHAUSTED
  - `SUBSCRIPTION_CANCELED` → any → TRIAL (or EXHAUSTED if no credits)
- `WALLET_CONSTANTS` exports: `FREE_TRIAL_CREDITS = 1000`, `PLATFORM_KEY_CAP_CREDITS = 2000`, `USD_PER_CREDIT_RETAIL = 0.005`.

## Scope (out)
- `authorize` / `commit` / `rollback` — issue 0010.
- BYOK key add/remove/encrypt — issue 0011.
- Stripe-driven plan changes — wired in issue 0019.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/wallet` | NEW — types + getBalance + transition |

## Test plan
- Failing tests first: every transition in the state machine has at least one passing test and one rejected-event test.
- Property test (fast-check): for any sequence of valid events, the wallet never enters an undefined state.
- Test boundary: `packages/wallet` (pure module — no DB needed for `transition`; mock DB for `getBalance`).

## Definition of done
- `transition()` is pure (no side effects); covered ≥95%.
- `getBalance` returns the correct shape for an existing wallet and throws `WalletNotFound` otherwise.
- All tests green.
- Public API <5 exports.
