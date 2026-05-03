# ADR 0004 — Wallet uses SERIALIZABLE isolation for `authorize` / `commit` / `rollback`

- **Status**: Accepted
- **Date**: 2026-05-03
- **Supersedes**: none
- **Issue**: `issues/closed/0010-wallet-authorize-commit-rollback.md`

## Context

The wallet's hold mechanism is the only place in the platform where money — well, credits, but they map directly to USD spend on Gemini — is mutated under user-driven concurrency. A single user clicking Generate twice in flight, or a buggy client retrying without idempotency, must never produce a balance that the ledger cannot explain.

Three correctness properties matter:

1. **No over-spend.** If `credits_remaining = 50` and 100 concurrent `authorize` calls each request 10 credits, exactly 5 succeed and the rest must fail with `INSUFFICIENT_CREDITS`. Sum of all successful holds must equal the original balance.
2. **No double-debit on retry.** Two `authorize` calls with the same `(userId, idempotencyKey)` must produce one ledger entry and one hold; the second call returns the existing token.
3. **Cap is honest.** Once `lifetime_platform_key_credits_consumed >= PLATFORM_KEY_CAP_CREDITS` and the wallet is on the platform key, the next `authorize` must reject with `CapReached` and never debit. Likewise, a `commit` whose `actualCredits` crosses the cap must transition state to `EXHAUSTED` atomically with the credit update.

## Decision

Every `authorize`, `commit`, `rollback`, and `expireHolds` call wraps its read-then-decide-then-write logic in a single Postgres transaction at **`SERIALIZABLE`** isolation level, and additionally locks the wallet row with `SELECT ... FOR UPDATE` before mutating it.

```ts
await db.transaction(
  async (tx) => { /* SELECT ... FOR UPDATE; UPDATE; INSERT */ },
  { isolationLevel: "serializable" },
);
```

## Why SERIALIZABLE specifically

Postgres' default `READ COMMITTED` permits *write skew*: two transactions can each read the wallet, both decide they have enough credits to authorize, both decrement, and both commit. The row-level lock from `FOR UPDATE` blocks concurrent updates of the same row, so in this *specific* code path `READ COMMITTED + FOR UPDATE` would also be safe. We pick `SERIALIZABLE` for two reasons:

1. **Defense in depth.** Future contributors will add new code paths (referrals, plan changes, refunds). If any of them forgets `FOR UPDATE`, `SERIALIZABLE` still gives us the safety net of detecting non-serializable interleavings via Postgres' SSI predicate locks. Returning `40001 serialization_failure` is recoverable; a silently corrupted balance is not.
2. **Documentation by code.** `isolationLevel: "serializable"` at the call site makes the safety stance obvious to readers; `READ COMMITTED + FOR UPDATE` is correct but reads as ad-hoc, and an audit has to understand the locking pattern across each query.

## Cost

- **Throughput.** Postgres SERIALIZABLE on a single hot row will serialize concurrent transactions and may emit `40001` retries. The application is responsible for retrying on this error code. We do not yet have an automatic retry loop — for v1 a `40001` surfaces to the user as a generic transient error and the client retries. Acceptable until the wedge is validated.
- **PGlite test fidelity.** Our test suite uses `@electric-sql/pglite` (Postgres compiled to WASM, single-threaded). Promise-style `Promise.all` of 100 concurrent `authorize` calls runs to JS-event-loop serialization, so the SERIALIZABLE *conflict-detection* path is not exercised by the test. The test still verifies the *outcome* property (sum of holds = balance, exactly N succeed) which catches the most likely real bugs (forgetting `FOR UPDATE`, wrong arithmetic, missing idempotency). Real Neon-branch contention testing is a follow-up issue (file when actual MRR > $0).
- **Cron sweeper bias.** `expireHolds` claims `FOR UPDATE` on every active expired hold in one transaction. If the table grows large (tens of thousands of stale holds), this transaction will hold many row locks. Acceptable at v1 scale (hundreds of users); revisit if `auth_tokens` grows past ~10k rows or if the cron starts conflicting with user-facing transactions.

## Alternatives considered

- **`READ COMMITTED` + careful `FOR UPDATE` placement.** Slightly cheaper. Rejected: relies on every contributor remembering to lock; no compiler enforcement.
- **Single atomic `UPDATE wallets SET credits_remaining = credits_remaining - $1 WHERE user_id = $2 AND credits_remaining >= $1 RETURNING ...`** with no transaction. Cheapest. Rejected: doesn't compose with the multi-row write of `auth_tokens` + `ledger_entries` in the same atomic step. We would have to split into two transactions and reconcile failures.
- **Application-level mutex (Redis lock).** Rejected: introduces a second source of truth that can desynchronize from Postgres' notion of committed state. Postgres already has the right primitive.

## Test coverage

`packages/wallet/src/wallet-ops.test.ts` exercises:

- INSUFFICIENT_CREDITS reject (no mutation)
- under/over-estimate commit reconciliation
- rollback restore
- 100-way concurrent authorize against an undersized balance
- idempotent authorize-by-key
- expireHolds: refund expired ACTIVE only, ignore COMMITTED / ROLLED_BACK
- CapReached at authorize, EXHAUSTED transition at commit
- TokenNotActive guards on commit/rollback re-entry
- ledger sum invariant: per token, sum of deltas = `−actualCredits`

## Follow-ups

- Add a `40001 serialization_failure` retry loop with bounded backoff in `gemini-gateway` once Stripe payment volume warrants it.
- Add a Neon-branch CI job for actual concurrent-contention testing once `apps/web` is publicly accessible.
- Index `auth_tokens(state, expires_at)` to speed up `expireHolds` once that table grows.
