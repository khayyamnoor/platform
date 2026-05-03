# Pricing Model

> Status: **LOCKED** by `docs/decisions/0001-platform-foundation-grill.md`. Changes require an ADR.

## Vision recap

- New users get a **free trial** of credits drawn from the platform's Gemini key.
- Subscriptions: **$30 / $60 / $90 monthly**, each granting a larger credit allowance from the platform key.
- **BYOK takeover**: once a user has consumed **$10 USD of platform-key Gemini cost**, they must add their own Gemini API key to keep using apps. Their subscription continues, but the app calls now run against their key.

## Credit definition

```
1 credit = $0.005 retail (what user pays)
                  ≈ $0.0025 of raw Gemini cost
                  → ~50% gross margin baked into the conversion ratio
```

The $10 BYOK cap (the threshold at which a user must add their own key) =
**2000 credits of platform-key consumption** = ~$5 of raw Gemini = $10 of retail credits.

## Plan matrix (locked)

| Plan        | Price/mo | Credits granted | Retail value | Raw Gemini headroom | Plan margin |
|-------------|----------|-----------------|--------------|---------------------|-------------|
| FREE        | $0       | 1000            | $5           | $2.50               | -$2.50 (CAC) |
| STARTER_30  | $30      | 3000            | $15          | $7.50               | $22.50      |
| PRO_60      | $60      | 7000            | $35          | $17.50              | $42.50      |
| MAX_90      | $90      | 12000           | $60          | $30                 | $60         |

**Reset cadence**: monthly, on Stripe billing anniversary. **Unused credits do not roll over.**

**Overage**: hard cap. When credits hit zero, `gemini-gateway` returns `INSUFFICIENT_CREDITS`. No silent overage. No auto top-up. Hit cap → either upgrade plan or add BYOK.

**Plan downgrades**: take effect at next billing anniversary. Cancellations end-of-period.

## The BYOK takeover state machine

```
                       ┌──────────────────┐
                       │      TRIAL       │  free credits, platform key
                       │  cap: $5 of cost │
                       └────────┬─────────┘
                                │ subscribe
                                ▼
              ┌─────────────────────────────────┐
              │   SUBSCRIBED_PLATFORM_KEY       │  paid plan, platform key
              │   running cap: $10 lifetime cost │  on platform key
              │     (sums TRIAL spend + paid)   │
              └────┬─────────────────┬──────────┘
                   │ user adds        │ hits $10 cap
                   │ BYOK key         ▼
                   ▼            ┌─────────────────────────┐
        ┌──────────────────────┐│      EXHAUSTED          │
        │  SUBSCRIBED_USER_KEY ││  no more platform calls │
        │  paid plan, user key ││  must add BYOK to       │
        │  unlimited (their $) ││  unblock                │
        └──────────┬───────────┘└────────┬────────────────┘
                   │ adds key            │
                   └────────────► back to SUBSCRIBED_USER_KEY
```

**Key invariants**:
- The $10 cap is **lifetime cost on the platform key**, not per-month. It's a "we subsidized your exploration enough" signal.
- TRIAL → cap is $5. If TRIAL exhausts, user can subscribe to bump to $10 total.
- Once SUBSCRIBED_USER_KEY, user pays Gemini directly through their key. Platform still bills them the $30/$60/$90 (for the SaaS — auth, UI, file storage, etc.).
- BYOK key is **encrypted at rest** (AES-256-GCM with a KMS-managed root key). Decrypted only inside `gemini-gateway`.

## Atomicity — the hard part

Every Gemini call is a 3-step transaction:

1. **AUTHORIZE** — `wallet.authorize(estimateCredits)` writes a hold to `auth_tokens`. Subtracts from `credits_remaining`. If insufficient → throw before the Gemini call.
2. **CALL** — `gemini-gateway` makes the actual API request.
3. **COMMIT or ROLLBACK** — on success, `wallet.commit(actualCredits)` finalizes the ledger entry and refunds the difference between estimate and actual. On error, `wallet.rollback` releases the hold.

**Why holds, not direct debit**: we don't know actual cost until Gemini returns (especially for token-priced models). Pre-call estimates can be wrong by 2x; we don't want to overcharge by undercharging only after the fact.

**Idempotency**: every authorize has a client-supplied idempotency key. Retries return the same hold.

**Long-running ops (Veo)**: video generation polls for minutes. The hold lives until the operation terminates — `auth_tokens.expires_at` extended by `gemini-gateway` while the job is active. Worker cron expires stale holds.

## Resolved

| # | Question | Resolution |
|---|----------|-----------|
| 1 | Credit math | 1 credit = $0.005 retail. Margin baked into ratio. |
| 2 | Per-app cost variability | Live cost on the Generate button via `gateway.estimate()`. Toast with actual after call. Marketing page also shows approximate action counts per plan. |
| 3 | Free trial | 1000 credits ≈ $5 retail (capped at $5 of platform-key spend). |
| 4 | Plan upgrades mid-cycle | Stripe-default proration (granted credits prorated to days remaining). Downgrades take effect at next anniversary. |
| 5 | Overage | Hard cap. No auto top-up in v1. |
| 6 | Cap-crossing UX | Pre-call estimate, hard reject. User adds BYOK and retries. |
| 7 | Credit-only top-up packs | Cut from v1. |
| 8 | Refunds | Manual ops in v1 — Stripe refund + manual `ledger_entries` adjustment. No self-serve refund UI. |
| 9 | BYOK validation | Yes — single throwaway `gemini-1.5-flash` 1-token call at paste time. Surface Gemini's verbatim error on failure. |
| 10 | Currency | USD only in v1. |

## BYOK key handling (locked)

- **Validation**: throwaway 1-token `gemini-1.5-flash` call at paste time (~$0.0001).
- **Storage**: Postgres `wallets.byok_key_encrypted bytea`, AES-256-GCM with per-user data keys. Data keys wrapped by platform root key in env var (`BYOK_ENCRYPTION_ROOT_KEY`, 32 bytes base64) for v1. Graduate to KMS in v1.5 (ADR-gated).
- **Retrieval**: decrypt **only inside `gemini-gateway`**, **only request-scoped**, **never logged**.
- **UX**: Settings → API key (masked: `AIzaSy••••••••AbCd`, last 4 visible). EXHAUSTED-state modal has inline paste field + "Test key" button.
