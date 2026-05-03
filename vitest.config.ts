import { defineConfig } from "vitest/config";

// Root config is intentionally minimal. Each package and app discovers its own
// `*.test.ts` files via Vitest's defaults when `pnpm test` runs in its workspace.
export default defineConfig({});
