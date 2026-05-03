// Inject env vars before any module imports run.
process.env.GEMINI_PLATFORM_KEY ??= "test-platform-key-not-real";
process.env.BYOK_ENCRYPTION_ROOT_KEY ??=
  Buffer.alloc(32, 0x42).toString("base64");
