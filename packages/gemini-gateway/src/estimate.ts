import { encode } from "gpt-tokenizer/model/gpt-4";
import { UnknownModel } from "./errors.js";
import { MODEL_REGISTRY, RETAIL_MARKUP, USD_PER_CREDIT_RETAIL } from "./models.js";
import type { EstimateResult, GenerateContentReq } from "./types.js";

/**
 * Pure: same input → same output. No I/O. Safe to import in client components.
 *
 * Formula:
 *   input_tokens = tokenize(prompt).length
 *   output_tokens = ceil(input_tokens × outputTokensPerInputToken)
 *   raw_usd = (input_tokens × inputUsdPer1k + output_tokens × outputUsdPer1k) / 1000
 *   credits = max(1, ceil(raw_usd × RETAIL_MARKUP / USD_PER_CREDIT_RETAIL))
 *
 * Always rounds up. Floors at 1 credit per call attempt — undercharge nightmare
 * is worse than slight overestimate.
 */
export function estimate(req: GenerateContentReq): EstimateResult {
  const rates = MODEL_REGISTRY[req.model];
  if (!rates) throw new UnknownModel(req.model);

  const inputTokens = encode(req.prompt).length;
  const outputTokens = Math.ceil(inputTokens * rates.outputTokensPerInputToken);

  const inputUsd = (inputTokens * rates.inputUsdPer1k) / 1000;
  const outputUsd = (outputTokens * rates.outputUsdPer1k) / 1000;
  const rawUsd = inputUsd + outputUsd;

  const retailUsd = rawUsd * RETAIL_MARKUP;
  const credits = Math.max(1, Math.ceil(retailUsd / USD_PER_CREDIT_RETAIL));

  return {
    credits,
    rawUsd,
    assumptions: [
      // Gemini does not publish its tokenizer; cl100k (gpt-4) is a close-enough
      // proxy for English prose and JSON. Off by ~10% in either direction is
      // absorbed by the 2× markup and the ceil().
      "Tokenization via gpt-tokenizer cl100k_base (proxy for Gemini's tokenizer)",
      `Output tokens estimated as ceil(input × ${rates.outputTokensPerInputToken})`,
      `Retail markup ${RETAIL_MARKUP}×, ceil to integer credits, floor at 1`,
    ],
  };
}
