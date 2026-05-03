# 0024 — observability: Axiom logger + integration

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0013, 0019
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
Structured logs flow to Axiom for the chokepoints (gateway, billing webhook, wallet errors). Logs are PII-and-key safe.

## Scope (in)
- `packages/observability/src/logger.ts`: `logger.info(event, fields)`, `logger.warn(...)`, `logger.error(...)`. Each call sends to Axiom via their `@axiomhq/js` client (or fetch HTTP if simpler). Outputs to stdout in dev.
- Standard fields injected automatically: `request_id`, `user_id` (if available), `app_id` (if available), `env` (`dev`/`preview`/`prod`).
- `redact()` helper that filters known sensitive keys (`api_key`, `byok_key`, `gemini_key`, `plaintext`, `authorization`, anything matching `/AIzaSy[A-Za-z0-9-_]+/`). Used as a final pass before send.
- Integrate into:
  - `gemini-gateway`: log `{event: 'gateway.call', app_id, model, estimate_credits, actual_credits, success, error_code}` for every call.
  - `billing.handleWebhook`: log `{event: 'billing.webhook', stripe_event_id, type, idempotent_skip, success}` for every event.
  - `wallet`: log only on errors / unusual states (CAP_REACHED, INSUFFICIENT_CREDITS hits per user/min).
- `.env.example` entries: `AXIOM_TOKEN`, `AXIOM_DATASET`.

## Scope (out)
- Sentry / error reporting — own follow-up, post-launch.
- Per-user activity feed in UI — out of v1.
- Custom Axiom dashboards — operator builds these in the Axiom UI.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/observability` | NEW |
| `packages/gemini-gateway` | + logger calls |
| `packages/billing` | + logger calls |
| `packages/wallet` | + logger calls (errors only) |

## Test plan
- Failing tests first:
  1. `redact()` strips an `AIzaSy...` key out of a payload.
  2. `redact()` strips known sensitive field names.
  3. Logger sends to a captured transport (mock fetch) with expected fields including request_id.
  4. Plaintext BYOK key never appears in any captured log when running an end-to-end gateway call test.
- Test boundary: `packages/observability` + integration tests in callers.

## Definition of done
- All 4 tests green.
- A captured log payload from the test mode showing fields land correctly in Axiom.
- A grep against the codebase confirms no `console.log(*key*)` remains.
