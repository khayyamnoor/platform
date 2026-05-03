import { expect, test } from "vitest";
import { PACKAGE_NAME } from "./index.js";

test("package skeleton smoke", () => {
  expect(PACKAGE_NAME).toBe("@platform/observability");
});
