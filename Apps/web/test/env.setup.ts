import { vi } from "vitest";

// Inject env vars before any module imports run.
process.env.BYOK_ENCRYPTION_ROOT_KEY ??= Buffer.alloc(32, 0x42).toString("base64");
process.env.GEMINI_PLATFORM_KEY ??= "test-platform-key-not-real";
process.env.CLERK_SECRET_KEY ??= "sk_test_dummy";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_dummy";

// Stub Next's `server-only` package so server modules can be imported
// from vitest without throwing. Real Next builds enforce the boundary
// via a webpack rule we can't replicate here.
vi.mock("server-only", () => ({}));
