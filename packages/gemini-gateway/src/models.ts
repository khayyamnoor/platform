import type { ModelId } from "./types.js";

export type ModelRates = {
  /** USD per 1K input tokens. */
  inputUsdPer1k: number;
  /** USD per 1K output tokens. */
  outputUsdPer1k: number;
  /** output_tokens / input_tokens ratio used to estimate generation length. */
  outputTokensPerInputToken: number;
};

/**
 * Cost rates per Gemini model. v1 contains only `gemini-2.5-pro` because the
 * cinematic director is text-only. Add entries as new wedges land — each new
 * model is a one-line registry update + a test that locks in the rate.
 */
export const MODEL_REGISTRY: Readonly<Record<ModelId, ModelRates>> = {
  "gemini-2.5-pro": {
    inputUsdPer1k: 0.00125,
    outputUsdPer1k: 0.005,
    // 1.5 covers the cinematic director's structured-JSON output well.
    // Refine per-app once we have post-call telemetry.
    outputTokensPerInputToken: 1.5,
  },
};

/**
 * 1 credit = $0.005 retail (per grill Q6). Mirrors WALLET_CONSTANTS.USD_PER_CREDIT_RETAIL
 * but kept as a local constant so the gateway has no runtime dep on @platform/wallet.
 */
export const USD_PER_CREDIT_RETAIL = 0.005;

/**
 * Markup applied to raw Gemini cost before converting to credits. 2× = 50%
 * margin baked into the credit conversion (PRD decision B).
 */
export const RETAIL_MARKUP = 2;
