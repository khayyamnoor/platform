# 0013 — gemini-gateway: clientForRequest + wallet integration

- **Status**: IN-REVIEW
- **Type**: AFK
- **Blocked-by**: 0010, 0012
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
The gateway can take a request, run the full authorize → call → commit/rollback cycle, and return a result whose shape matches `@google/genai`'s `models.generateContent`. **This is the chokepoint the entire platform depends on.**

## Scope (in)
- `packages/gemini-gateway/src/clientForRequest.ts`: `clientForRequest(ctx: { userId, appId, idempotencyKey?, requestId }): Promise<GatewayClient>`.
  - The returned client exposes `models.generateContent(req)` matching `@google/genai`'s shape.
  - Internally for each call:
    1. `estimate(req)` → get `estimateCredits`.
    2. `wallet.authorize({ userId, estimateCredits, idempotencyKey })` → get token. If `INSUFFICIENT_CREDITS` or `CAP_REACHED`, surface to caller.
    3. Pick the API key: platform key from `GEMINI_PLATFORM_KEY` env. (BYOK routing is issue 0014; assume platform key here for now.)
    4. Call `@google/genai`'s `GoogleGenAI.models.generateContent(req)` with the chosen key. **This is the only file in the codebase allowed to import `@google/genai`** — Biome rule enforces.
    5. On success: parse response, compute actual cost from `usageMetadata.promptTokenCount` + `candidatesTokenCount`, then `wallet.commit(token, actualCredits, { usedPlatformKey: true })`. Insert `app_runs` row with `SUCCESS`.
    6. On error: `wallet.rollback(token)`. Insert `app_runs` row with `FAILED` and the verbatim error.
- 30s per-call timeout (per PRD decision F).
- No retries (per PRD decision G).
- `GEMINI_PLATFORM_KEY` is read **once at module init** and held in module scope; never logged.

## Scope (out)
- BYOK routing — issue 0014.
- Image / Veo / audio surfaces — future slices.
- Streaming — not in v1.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/gemini-gateway` | + clientForRequest, internal Gemini import, env-var loader |
| `.env.example` | + `GEMINI_PLATFORM_KEY` |

## Test plan
- Failing tests first (use `msw` or `undici` interceptor to mock Gemini HTTP; real wallet against test DB):
  1. Successful call: wallet debited by actual credits, `app_runs` row SUCCESS, response shape matches `@google/genai`.
  2. Gemini returns 429: rollback called, `app_runs` row FAILED with verbatim `429` error message.
  3. Gemini returns 200 with `usageMetadata` showing higher-than-estimated cost: commit reconciles correctly (extra credits debited).
  4. Gemini hangs >30s: timeout, rollback called.
  5. Insufficient credits before call: wallet throws, no Gemini call made.
  6. CAP_REACHED before call: wallet throws, no Gemini call made.
  7. Idempotent retry with same idempotencyKey: only one Gemini call made.
- Test boundary: `packages/gemini-gateway` package — black-box, mocking only the Gemini HTTP layer.

## Definition of done
- All 7 tests green.
- `@google/genai` imported in exactly one file; lint rule rejects elsewhere.
- `GEMINI_PLATFORM_KEY` never appears in any log or error message; lint rule asserts.
- `clientForRequest` returns a frozen object — caller cannot patch the function.
