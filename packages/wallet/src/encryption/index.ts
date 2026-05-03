// Module-load eager validation: if BYOK_ENCRYPTION_ROOT_KEY is missing or
// malformed, this throws here, before any encrypt/decrypt code path runs.
import type { Buffer } from "node:buffer";
import { validateRootKey } from "./root-key.js";

const ROOT_KEY: Buffer = validateRootKey(process.env.BYOK_ENCRYPTION_ROOT_KEY);

export function getRootKey(): Buffer {
  return ROOT_KEY;
}

export {
  decryptKey,
  encryptKey,
  generateDataKey,
  unwrapDataKey,
  wrapDataKey,
} from "./cipher.js";
export { RootKeyMisconfigured, validateRootKey } from "./root-key.js";
