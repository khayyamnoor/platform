# 0010 — wallet package: authorize / commit / rollback

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0005, 0009
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
The wallet's hold mechanism works correctly under concurrent use. **This is the riskiest module in the platform — most rigorous tests of the slice land here.**

## Scope (in)
- `packages/wallet/src/authorize.ts`: `authorize(db, {userId, estimateCredits, idempotencyKey}): Promise<AuthToken>`.
  - Inside SERIALIZABLE transaction:
    1. Read wallet `FOR UPDATE`.
    2. Check `credits_remaining ≥ estimateCredits` → else throw `INSUFFICIENT_CREDITS`.
    3. Check whether commit would push `lifetime_platform_key_credits_consumed` past `PLATFORM_KEY_CAP_CREDITS` AND state is platform-key → if so, throw `CAP_REACHED`.
    4. Decrement `credits_remaining` by `estimateCredits`.
    5. Insert `auth_tokens` row + `ledger_entries` row (`reason: AUTHORIZE`).
  - Idempotency: if `(userId, idempotencyKey)` already exists, return the existing token rather than creating a new hold.
- `packages/wallet/src/commit.ts`: `commit(db, {tokenId, actualCredits}): Promise<void>`.
  - In transaction: mark token `COMMITTED`; if `actualCredits < estimate`, refund the difference to `credits_remaining`; if `actualCredits > estimate`, debit the difference (allow going negative — see CAP_REACHED handling below); increment `lifetime_platform_key_credits_consumed` by `actualCredits` ONLY IF the call used the platform key (passed as a flag); insert `ledger_entries` row (`reason: COMMIT`).
  - If post-commit `lifetime_platform_key_credits_consumed ≥ PLATFORM_KEY_CAP_CREDITS` AND state is `SUBSCRIBED_PLATFORM_KEY`, transition to `EXHAUSTED`.
- `packages/wallet/src/rollback.ts`: `rollback(db, tokenId): Promise<void>`. Mark token `ROLLED_BACK`; refund full hold to `credits_remaining`; insert `ledger_entries` row (`reason: ROLLBACK`).
- `packages/wallet/src/expireHolds.ts`: cron-callable. Sweeps active holds past `expires_at` and rolls them back. Wired into Vercel Cron in a follow-up but the function ships here.

## Scope (out)
- BYOK key add/remove (issue 0011).
- Plan changes (issue 0019).
- Stripe-driven credit grants (issue 0019).
- Cron schedule wiring — issue 0024.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/wallet` | + authorize, commit, rollback, expireHolds |
| `packages/db` | + tx helper if not already present |

## Test plan
- Failing tests first (in this order):
  1. authorize on insufficient balance throws `INSUFFICIENT_CREDITS` and does not mutate.
  2. authorize then commit with smaller actual refunds the difference.
  3. authorize then commit with larger actual debits the difference.
  4. authorize then rollback returns balance to original.
  5. **Concurrency**: 100 parallel authorize calls totalling more than balance — exactly the right number succeed; the rest throw INSUFFICIENT_CREDITS; sum of holds = original balance.
  6. Idempotency: two authorize calls with same idempotencyKey return same token, only one ledger entry written.
  7. expireHolds rolls back active holds past expiry; ignores already-committed/rolled-back tokens.
  8. CAP_REACHED: when commit pushes lifetime past 2000 credits, state transitions to EXHAUSTED.
- Test boundary: `packages/wallet` with a real Postgres test DB (use `pg-mem` or `pglite` for speed; if those don't support SERIALIZABLE, escalate to a real Neon test branch).
- Feedback loops: pnpm test, pnpm typecheck, pnpm lint.

## Definition of done
- All 8 tests green, run repeatedly without flakes.
- Public API: `authorize`, `commit`, `rollback`, `expireHolds`. Nothing else exported.
- ADR `0004-wallet-isolation-level.md` documenting why SERIALIZABLE was chosen and what the cost is.
