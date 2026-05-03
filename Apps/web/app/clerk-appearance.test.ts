import { describe, expect, test } from "vitest";
import { coinbaseAppearance } from "./clerk-appearance";

describe("clerk appearance (Coinbase theme)", () => {
  test("colorPrimary is Coinbase blue #0052ff", () => {
    expect(coinbaseAppearance.variables.colorPrimary).toBe("#0052ff");
  });

  test("text + body colors match design tokens", () => {
    expect(coinbaseAppearance.variables.colorText).toBe("#0a0b0d"); // --color-ink
    expect(coinbaseAppearance.variables.colorTextSecondary).toBe("#5b616e"); // --color-body
  });

  test("danger / success / warning track semantic tokens", () => {
    expect(coinbaseAppearance.variables.colorDanger).toBe("#cf202f");
    expect(coinbaseAppearance.variables.colorSuccess).toBe("#05b169");
    expect(coinbaseAppearance.variables.colorWarning).toBe("#f4b000");
  });

  test("borderRadius matches --radius-sm (Coinbase aesthetic is mostly square)", () => {
    expect(coinbaseAppearance.variables.borderRadius).toBe("4px");
  });

  test("primary button class string targets the Coinbase blue + active state", () => {
    expect(coinbaseAppearance.elements.formButtonPrimary).toContain("bg-[#0052ff]");
    expect(coinbaseAppearance.elements.formButtonPrimary).toContain("hover:bg-[#003ecc]");
  });
});
