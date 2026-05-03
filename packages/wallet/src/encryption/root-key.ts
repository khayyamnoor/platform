import { Buffer } from "node:buffer";

const ROOT_KEY_BYTES = 32;

export class RootKeyMisconfigured extends Error {
  constructor(reason: string) {
    super(`BYOK_ENCRYPTION_ROOT_KEY is misconfigured: ${reason}`);
    this.name = "RootKeyMisconfigured";
  }
}

/**
 * Validate and decode the BYOK encryption root key. Throws synchronously on
 * any failure so the application crashes at module load instead of silently
 * mis-encrypting user keys at first call.
 */
export function validateRootKey(raw: string | undefined): Buffer {
  if (!raw || raw.length === 0) {
    throw new RootKeyMisconfigured("env var is unset or empty");
  }
  // Reject anything that isn't valid base64 (Buffer.from is too lenient — it
  // silently truncates on bad chars), so we guard with a regex first.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    throw new RootKeyMisconfigured("not valid base64");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== ROOT_KEY_BYTES) {
    throw new RootKeyMisconfigured(
      `expected ${ROOT_KEY_BYTES} bytes after base64 decode, got ${buf.length}`,
    );
  }
  return buf;
}
