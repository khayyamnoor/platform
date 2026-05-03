export {
  ByokInvalid,
  ByokRequired,
  clientForRequest,
  DuplicateGatewayRequest,
  GatewayTimeout,
  type GatewayClient,
  type GatewayContext,
} from "./clientForRequest.js";
export { UnknownModel } from "./errors.js";
export { computeCreditsFromTokens, estimate } from "./estimate.js";
export {
  MODEL_REGISTRY,
  RETAIL_MARKUP,
  USD_PER_CREDIT_RETAIL,
  type ModelRates,
} from "./models.js";
export { PlatformKeyMisconfigured } from "./platform-key.js";
export type { EstimateResult, GenerateContentReq, ModelId } from "./types.js";

export const PACKAGE_NAME = "@platform/gemini-gateway" as const;
