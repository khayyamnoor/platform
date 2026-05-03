export type ModelId = "gemini-2.5-pro";

export type GenerateContentReq = {
  model: ModelId;
  prompt: string;
};

export type EstimateResult = {
  /** Credits the wallet should authorise for this call. Always ≥ 1. */
  credits: number;
  /** Raw Gemini USD cost (no markup). For reporting / observability only. */
  rawUsd: number;
  /** Human-readable list of the heuristics that produced this number. */
  assumptions: string[];
};
