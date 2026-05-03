import { encode } from "gpt-tokenizer/model/gpt-4";
import { UnknownModel } from "./errors.js";
import { MODEL_REGISTRY, RETAIL_MARKUP, USD_PER_CREDIT_RETAIL } from "./models.js";
import type { EstimateResult, GenerateContentReq, ModelId } from "./types.js";

/**
 * Convert (model, input_tokens, output_tokens) to credits + raw USD cost.
 * Pure: same input → same output.
 *
 * Used by both:
 *   - estimate(req): pre-call, with output_tokens projected from input × ratio
 *   - clientForRequest: post-call, with usageMetadata's actual token counts
 *
 * Always rounds up. Floors at 1 credit per call attempt.
 */
export function computeCreditsFromTokens(
  model: ModelId,
  inputTokens: number,
  outputTokens: number,
): { credits: number; rawUsd: number } {
  const rates = MODEL_REGISTRY[model];
  if (!rates) throw new UnknownModel(model);

  const inputUsd = (inputTokens * rates.inputUsdPer1k) / 1000;
  const outputUsd = (outputTokens * rates.outputUsdPer1k) / 1000;
  const rawUsd = inputUsd + outputUsd;

  const retailUsd = rawUsd * RETAIL_MARKUP;
  const credits = Math.max(1, Math.ceil(retailUsd / USD_PER_CREDIT_RETAIL));
  return { credits, rawUsd };
}

/**
 * Pre-call estimate. Tokenises the prompt with gpt-tokenizer cl100k as a
 * proxy for Gemini's tokenizer (Gemini does not publish theirs), projects
 * output tokens from the model's outputTokensPerInputToken ratio, then
 * delegates to computeCreditsFromTokens.
 */
export function estimate(req: GenerateContentReq): EstimateResult {
  const rates = MODEL_REGISTRY[req.model];
  if (!rates) throw new UnknownModel(req.model);

  const inputTokens = encode(req.contents).length;
  const outputTokens = Math.ceil(inputTokens * rates.outputTokensPerInputToken);
  const { credits, rawUsd } = computeCreditsFromTokens(req.model, inputTokens, outputTokens);

  return {
    credits,
    rawUsd,
    assumptions: [
      "Tokenization via gpt-tokenizer cl100k_base (proxy for Gemini's tokenizer)",
      `Output tokens estimated as ceil(input × ${rates.outputTokensPerInputToken})`,
      `Retail markup ${RETAIL_MARKUP}×, ceil to integer credits, floor at 1`,
    ],
  };
}
