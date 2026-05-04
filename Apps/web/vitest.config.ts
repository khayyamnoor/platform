import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./test/env.setup.ts"],
  },
  esbuild: {
    jsx: "automatic",
  },
});
