/**
 * Lazy validation: BYOK_ENCRYPTION_ROOT_KEY is checked on the first call to
 * `getRootKey()`, not at module-graph load time. Two reasons:
 *   1. Next.js's `next build` walks the module graph during "page data
 *      collection" before any request fires; eager validation broke builds
 *      whose CI/Vercel env wasn't fully populated.
 *   2. The 0011 DoD intent — "fail fast before any decrypt" — is still
 *      met: every encrypt/decrypt path goes through `getRootKey()`, so a
 *      misconfigured deployment crashes on the first call (effectively at
 *      first request, before any plaintext is touched).
 *
 * Tests for `validateRootKey` (unset / malformed / wrong-length) still
 * call the function directly and assert it throws — the validator behaviour
 * is unchanged, only the eager invocation is deferred.
 */
import type { Buffer } from "node:buffer";
import { validateRootKey } from "./root-key.js";

let ROOT_KEY: Buffer | null = null;

export function getRootKey(): Buffer {
  if (ROOT_KEY === null) {
    ROOT_KEY = validateRootKey(process.env.BYOK_ENCRYPTION_ROOT_KEY);
  }
  return ROOT_KEY;
}

/** Test-only: clear the cached root key so a subsequent getRootKey() re-validates. */
export function _resetRootKeyForTests(): void {
  ROOT_KEY = null;
}

export {
  decryptKey,
  encryptKey,
  generateDataKey,
  unwrapDataKey,
  wrapDataKey,
} from "./cipher.js";
export { RootKeyMisconfigured, validateRootKey } from "./root-key.js";
