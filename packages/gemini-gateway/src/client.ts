/**
 * Client-safe entry point. Re-exports only the pure, browser-bundleable
 * pieces — no `@google/genai`, no `@platform/db`, no `@platform/wallet`,
 * no `pg`, no Node built-ins. Safe to import in `"use client"` modules.
 */
export { UnknownModel } from "./errors.js";
export { computeCreditsFromTokens, estimate } from "./estimate.js";
export {
  MODEL_REGISTRY,
  RETAIL_MARKUP,
  USD_PER_CREDIT_RETAIL,
  type ModelRates,
} from "./models.js";
export type { EstimateResult, GenerateContentReq, ModelId } from "./types.js";
