# 0022 — apps/web: cap-reached modal + inline BYOK paste/validate (TRACEABLE BULLET 3)

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0011, 0014, 0017, 0021
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
A user who hits the $10 platform-key cap mid-session is shown a modal with an inline paste field for their Gemini key. They paste, it validates against Gemini, saves, and their next Generate click goes through on their key.

## Scope (in)
- `apps/web/components/byok-required-modal.tsx`: shown when an API call to `/api/apps/.../run` returns `BYOK_REQUIRED` or `CAP_REACHED`.
- Modal copy: *"Your free trial of $10 platform credits is used up. Add your own Gemini API key to keep generating. The key is encrypted and only used for your generations — we never log it."*
- Inline paste field (`Input` from getdesign) + "Test key" button + "Save & Continue" button + link "How to get a Gemini key" → opens AI Studio in new tab.
- "Test key" calls `/api/wallet/test-byok-key` which runs the paste-time validation (1-token `gemini-1.5-flash` call). Surfaces verbatim error on failure (e.g., "API key not valid", "permission denied").
- "Save & Continue" calls `/api/wallet/byok-key` POST (which goes through `wallet.addByokKey`) → on success, retries the original generation that was blocked.
- The modal carries over the original failed request so the retry can happen without user re-entering input.
- After successful save: state transitions to `SUBSCRIBED_USER_KEY`; Generate retry runs; balance pill stops decreasing for this user (their key, their bill).

## Scope (out)
- Settings page management — issue 0023.
- Email notifications — out of v1.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web` | + modal component + 2 API routes (test-byok-key, byok-key POST) + integration into useGateway |
| `packages/wallet` | (called: addByokKey) |
| `packages/gemini-gateway` | + `validateByokKey(plaintextKey)` helper (the 1-token test call) |

## Test plan
- Failing tests first:
  1. Playwright: get a user to EXHAUSTED state (seed wallet with `lifetime_platform_key_credits_consumed = 2001`); attempt to Generate; modal appears.
  2. Modal: paste an invalid key → click Test key → error displayed.
  3. Modal: paste a valid test-mode key → Test key passes; Save & Continue runs the original generation; toast confirms; balance pill stays the same (their key was used).
  4. Cancel button on modal returns user to dashboard; state remains EXHAUSTED.
  5. Race: cap reached mid-call (estimate undershoot, commit overshoot) → next call shows modal.
- Test boundary: `apps/web` component + Playwright e2e.

## Definition of done
- All 5 tests green.
- Visual QA: light + dark.
- BYOK key value never leaves the request lifecycle (verify in observability layer — no payload logging).
- Modal accessibility: focus trap, ESC closes, screen-reader labels.
