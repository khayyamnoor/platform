# @platform/gemini-gateway

The single chokepoint for Gemini calls (per CLAUDE.md rule 3: no app code imports `@google/genai` directly).

## What ships in 0012 — `estimate`

A pure cost estimator. Used both server-side (to size the wallet authorize hold) and client-side (to make the Generate button live-update its credit cost).

```ts
import { estimate } from "@platform/gemini-gateway";

const result = estimate({
  model: "gemini-2.5-pro",
  prompt: "Generate a 30-shot list for a noir detective scene set in Tokyo.",
});

result.credits;     // integer ≥ 1, the number of credits to authorize
result.rawUsd;      // raw Gemini cost in USD (no markup) — observability only
result.assumptions; // string[] explaining the heuristics that produced the number
```

`estimate` is pure (deterministic) and has no Node-only deps, so it is safe to import in client components.

## Formula

```
input_tokens   = tokenize(prompt).length            // gpt-tokenizer cl100k (gpt-4)
output_tokens  = ceil(input_tokens × rates.outputTokensPerInputToken)
raw_usd        = (input_tokens  × rates.inputUsdPer1k
               +  output_tokens × rates.outputUsdPer1k) / 1000
retail_usd     = raw_usd × RETAIL_MARKUP            // 2× per PRD decision B
credits        = max(1, ceil(retail_usd / USD_PER_CREDIT_RETAIL))   // $0.005/credit
```

Always rounds up. Floors at 1 credit per call attempt — undercharging is worse than slight overestimation.

## Worked example — `gemini-2.5-pro`, 500-token prompt

Rates (from `MODEL_REGISTRY["gemini-2.5-pro"]`):
- `inputUsdPer1k = 0.00125`
- `outputUsdPer1k = 0.005`
- `outputTokensPerInputToken = 1.5`

```
input_tokens   = 500
output_tokens  = ceil(500 × 1.5) = 750
raw_usd        = (500 × 0.00125 + 750 × 0.005) / 1000
              = (0.625 + 3.75) / 1000
              = 0.004375
retail_usd     = 0.004375 × 2 = 0.00875
credits        = max(1, ceil(0.00875 / 0.005)) = max(1, ceil(1.75)) = 2
```

So a 500-token prompt costs **2 credits**. Empty prompt costs **1 credit** (the floor).

## Heuristics (what we knowingly approximate)

1. **Tokenizer.** Gemini does not publish its tokenizer, so we use `gpt-tokenizer/model/gpt-4` (cl100k_base) as a proxy. Off by ~10% in either direction for English prose; absorbed by the 2× markup and the `ceil()`.
2. **Output length.** We assume `output ≈ input × 1.5` for the cinematic director's structured-JSON output. Refine per app once we have post-call telemetry.
3. **Always overestimate.** `ceil()` and the 1-credit floor make undercharging structurally impossible. The post-call `commit` reconciles to the actual usage.

## Adding a new model

Append an entry to `MODEL_REGISTRY` in `src/models.ts` and add a test that locks in the rates. The `estimate` formula stays the same.

## Out of scope (handled in later issues)

- The actual `models.generateContent` call → 0013
- BYOK key routing → 0014
- Image / Veo cost estimators → land with their respective wedges
