export { UnknownModel } from "./errors.js";
export { estimate } from "./estimate.js";
export {
  MODEL_REGISTRY,
  RETAIL_MARKUP,
  USD_PER_CREDIT_RETAIL,
  type ModelRates,
} from "./models.js";
export type { EstimateResult, GenerateContentReq, ModelId } from "./types.js";

export const PACKAGE_NAME = "@platform/gemini-gateway" as const;
