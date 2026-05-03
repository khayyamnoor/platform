// Set a deterministic 32-byte root key for tests before any wallet module
// imports. Real deployments inject BYOK_ENCRYPTION_ROOT_KEY via .env.

import { Buffer } from "node:buffer";

if (!process.env.BYOK_ENCRYPTION_ROOT_KEY) {
  const testKey = Buffer.alloc(32, 0x42); // 32 bytes of 0x42
  process.env.BYOK_ENCRYPTION_ROOT_KEY = testKey.toString("base64");
}
