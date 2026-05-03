export type ModelId = "gemini-2.5-pro";

/**
 * Mirrors `@google/genai`'s `GenerateContentParameters` for the v1 single-string
 * use case (the cinematic director's only mode). When future wedges need
 * multi-turn `Content[]`, widen `contents` to `string | Content[]`.
 */
export type GenerateContentReq = {
  model: ModelId;
  contents: string;
};

export type EstimateResult = {
  /** Credits the wallet should authorise for this call. Always ≥ 1. */
  credits: number;
  /** Raw Gemini USD cost (no markup). For reporting / observability only. */
  rawUsd: number;
  /** Human-readable list of the heuristics that produced this number. */
  assumptions: string[];
};
