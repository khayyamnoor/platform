import { describe, expect, test } from "vitest";
import { config } from "./middleware";

/**
 * Lightweight middleware checks. The actual route-protection behaviour is
 * exercised end-to-end by Playwright in issue 0025 (which spins up a dev
 * server and asserts the unauthenticated-→-/sign-in redirect from the issue
 * test plan); here we just verify the matcher shape so a regression that
 * breaks the matcher fails CI fast.
 */
describe("middleware config", () => {
  test("matcher includes the Next.js page-route catch-all and the API/trpc paths", () => {
    expect(config.matcher).toBeInstanceOf(Array);
    expect(config.matcher.some((p) => p.startsWith("/((?!_next"))).toBe(true);
    expect(config.matcher.some((p) => p.includes("api"))).toBe(true);
  });

  test("matcher excludes static asset extensions", () => {
    const pageMatcher = config.matcher.find((p) => p.startsWith("/((?!_next"));
    expect(pageMatcher).toBeDefined();
    expect(pageMatcher).toContain("png");
    expect(pageMatcher).toContain("svg");
    expect(pageMatcher).toContain("woff");
  });
});
