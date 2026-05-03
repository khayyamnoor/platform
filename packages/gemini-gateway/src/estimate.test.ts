import { encode } from "gpt-tokenizer/model/gpt-4";
import { describe, expect, test } from "vitest";
import { UnknownModel } from "./errors.js";
import { estimate } from "./estimate.js";
import { MODEL_REGISTRY, RETAIL_MARKUP, USD_PER_CREDIT_RETAIL } from "./models.js";
import type { GenerateContentReq } from "./types.js";

describe("estimate", () => {
  test("empty prompt → minimum 1 credit (we never charge 0 for a real call attempt)", () => {
    const result = estimate({ model: "gemini-2.5-pro", prompt: "" });
    expect(result.credits).toBe(1);
    expect(result.rawUsd).toBe(0);
  });

  test("unknown model → throws UnknownModel", () => {
    expect(() =>
      estimate({
        // biome-ignore lint/suspicious/noExplicitAny: testing the runtime guard
        model: "gemini-fake-model" as any,
        prompt: "anything",
      } satisfies Partial<GenerateContentReq> as GenerateContentReq),
    ).toThrow(UnknownModel);
  });

  test("gemini-2.5-pro: 500-token prompt produces credits matching the formula", () => {
    // Build a deterministic 500-token prompt.
    const filler = "The quick brown fox jumps over the lazy dog. ";
    let prompt = "";
    while (encode(prompt + filler).length < 500) prompt += filler;
    while (encode(prompt).length > 500) prompt = prompt.slice(0, -1);
    while (encode(prompt).length < 500) prompt += "x";
    const inputTokens = encode(prompt).length;
    expect(inputTokens).toBe(500);

    const rates = MODEL_REGISTRY["gemini-2.5-pro"];
    const outputTokens = Math.ceil(inputTokens * rates.outputTokensPerInputToken);
    const rawUsd = (inputTokens * rates.inputUsdPer1k + outputTokens * rates.outputUsdPer1k) / 1000;
    const expectedCredits = Math.max(
      1,
      Math.ceil((rawUsd * RETAIL_MARKUP) / USD_PER_CREDIT_RETAIL),
    );

    const result = estimate({ model: "gemini-2.5-pro", prompt });

    expect(result.credits).toBe(expectedCredits);
    expect(result.rawUsd).toBeCloseTo(rawUsd, 12);
    expect(result.credits).toBeGreaterThanOrEqual(1);
  });

  test("estimator is pure: same input → same output across many calls", () => {
    const req: GenerateContentReq = {
      model: "gemini-2.5-pro",
      prompt: "Write a 30-shot list for a noir detective scene set in a rain-soaked Tokyo alley.",
    };
    const first = estimate(req);
    for (let i = 0; i < 50; i++) {
      const next = estimate(req);
      expect(next.credits).toBe(first.credits);
      expect(next.rawUsd).toBe(first.rawUsd);
      expect(next.assumptions).toEqual(first.assumptions);
    }
  });

  test("credits scale monotonically with prompt length", () => {
    const short = estimate({ model: "gemini-2.5-pro", prompt: "Hi" });
    const medium = estimate({
      model: "gemini-2.5-pro",
      prompt: "Generate a structured JSON shot list with 30 detailed shots.".repeat(5),
    });
    const long = estimate({
      model: "gemini-2.5-pro",
      prompt: "Generate a structured JSON shot list with 30 detailed shots.".repeat(50),
    });
    expect(long.credits).toBeGreaterThan(medium.credits);
    expect(medium.credits).toBeGreaterThanOrEqual(short.credits);
  });

  test("assumptions array describes the heuristics used", () => {
    const result = estimate({ model: "gemini-2.5-pro", prompt: "anything" });
    expect(result.assumptions.some((a) => a.toLowerCase().includes("token"))).toBe(true);
    expect(
      result.assumptions.some((a) => a.toLowerCase().includes("markup") || a.includes("×")),
    ).toBe(true);
  });
});
