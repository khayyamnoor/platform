# 0014 — gemini-gateway: BYOK key routing

- **Status**: IN-REVIEW
- **Type**: AFK
- **Blocked-by**: 0011, 0013
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
The gateway picks the right Gemini key (platform vs user) based on wallet state, and decryption of the user key is request-scoped + never logged.

## Scope (in)
- Modify `clientForRequest.ts` to:
  - Read `wallet.state` for `userId` at the start of each call.
  - If state is `SUBSCRIBED_USER_KEY`: call `wallet.getDecryptedByokKey(userId)`, pass plaintext into the Gemini SDK call as a request-scoped variable. **Do not store, do not log, drop reference at end of try-block.**
  - Else if state is `SUBSCRIBED_PLATFORM_KEY` or `TRIAL`: use platform key.
  - Else if state is `EXHAUSTED`: throw `BYOK_REQUIRED` (caller surfaces the modal).
- `commit()` is called with `{ usedPlatformKey: false }` when the BYOK key was used → `lifetime_platform_key_credits_consumed` is NOT incremented (only platform-key spend counts toward the cap).
- A `tryFinally` wrapper ensures the plaintext key reference is overwritten before the function returns, even on error paths.
- New error type `BYOK_INVALID` is thrown if Gemini returns 401/403 with the user's key (with a hint to re-validate). Wallet is NOT debited (since no work was done) — but we don't auto-roll-back the key, just surface the error.

## Scope (out)
- Paste-time validation call — that's a separate flow from `apps/web` (issue 0022).
- Replace-key UX — issue 0023.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/gemini-gateway` | clientForRequest extended with key routing + state checks |
| `packages/wallet` | (called, not modified) |

## Test plan
- Failing tests first (extending the test suite from 0013):
  1. Wallet state TRIAL → platform key used; lifetime_platform_key_credits_consumed increments.
  2. Wallet state SUBSCRIBED_PLATFORM_KEY → platform key used; lifetime increments.
  3. Wallet state SUBSCRIBED_USER_KEY → user key used (decrypted at call time); lifetime does NOT increment.
  4. Wallet state EXHAUSTED → throws `BYOK_REQUIRED`; no Gemini call made.
  5. User key rejected by Gemini (mocked 401) → throws `BYOK_INVALID`; no wallet mutation; key is NOT removed automatically.
  6. Plaintext key value never appears in `app_runs.error_message` even if Gemini 500s with the key in headers.
  7. Plaintext key reference is null in module-scope after call — verify via memory probe (best-effort; document if not feasible).
- Test boundary: `packages/gemini-gateway` integration tests with full wallet + DB.

## Definition of done
- All 7 tests green.
- Manual code review confirms plaintext key never crosses the request boundary.
- Lint rule asserts `getDecryptedByokKey` only called inside `gemini-gateway`.
