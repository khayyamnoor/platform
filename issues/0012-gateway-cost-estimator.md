# 0012 — gemini-gateway: cost estimator for gemini-2.5-pro text gen

- **Status**: IN-REVIEW
- **Type**: AFK
- **Blocked-by**: 0002
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
A pure function that estimates credit cost for any `models.generateContent` request to `gemini-2.5-pro`, used by both server and client (Generate button live updates).

## Scope (in)
- `packages/gemini-gateway/src/estimate.ts`: `estimate(req: GenerateContentReq): { credits: number; rawUsd: number; assumptions: string[] }`.
  - Tokenize input text with `tiktoken` or `gpt-tokenizer` (close-enough heuristic; document in assumptions).
  - For `gemini-2.5-pro`: input @ $0.00125 / 1K tokens, output @ $0.005 / 1K tokens.
  - For our cinematic-director use case (structured JSON), assume `output_tokens = input_tokens * 1.5` ceiling.
  - Apply 2× retail markup → divide by `$0.005/credit` → ceil to integer credits.
  - Always round up — undercharge nightmare worse than slight overestimate.
- `packages/gemini-gateway/src/models.ts`: model registry mapping model id → cost rates. v1 contains only `gemini-2.5-pro` entry; structure ready for additions per future slices.
- Pure function, no imports from `wallet` or `db`. Safe to import in client components.
- Export TypeScript types `GenerateContentReq`, `EstimateResult`.

## Scope (out)
- Image / Veo cost estimators — added when those apps land.
- Calling Gemini — issue 0013.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/gemini-gateway` | + estimate, models registry, types |

## Test plan
- Failing tests first:
  1. Empty prompt → ≥1 credit (we never charge 0 for a real call attempt).
  2. 500-token prompt for `gemini-2.5-pro` → expected credit number per formula.
  3. Unknown model → throws `UnknownModel`.
  4. Estimator is pure: same input → same output across many calls.
- Test boundary: `packages/gemini-gateway` (pure function tests; no DB, no network).

## Definition of done
- All tests green.
- `estimate` is exported and importable in client components (no Node-only deps).
- Documented in `packages/gemini-gateway/README.md` with formula and a worked example.
