import { Buffer } from "node:buffer";
import {
  type CipherGCM,
  type DecipherGCM,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm" as const;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DATA_KEY_BYTES = 32;

/**
 * Wire format for every ciphertext we store:
 *   [ IV (12 bytes) ][ ciphertext (variable) ][ auth tag (16 bytes) ]
 * No version byte yet — when we rotate to v2, prepend a 1-byte version.
 */
function pack(iv: Buffer, ciphertext: Buffer, tag: Buffer): Buffer {
  return Buffer.concat([iv, ciphertext, tag]);
}

function unpack(packed: Buffer): { iv: Buffer; ciphertext: Buffer; tag: Buffer } {
  if (packed.length < IV_BYTES + TAG_BYTES) {
    throw new Error(`ciphertext too short: ${packed.length} bytes`);
  }
  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(packed.length - TAG_BYTES);
  const ciphertext = packed.subarray(IV_BYTES, packed.length - TAG_BYTES);
  return { iv, ciphertext, tag };
}

function encryptBytes(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv) as CipherGCM;
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return pack(iv, ciphertext, tag);
}

function decryptBytes(packed: Buffer, key: Buffer): Buffer {
  const { iv, ciphertext, tag } = unpack(packed);
  const decipher = createDecipheriv(ALGO, key, iv) as DecipherGCM;
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// --- public surface ---------------------------------------------------------

/** Generate a fresh 32-byte data key. Caller stores the *wrapped* version. */
export function generateDataKey(): Buffer {
  return randomBytes(DATA_KEY_BYTES);
}

export function wrapDataKey(dataKey: Buffer, rootKey: Buffer): Buffer {
  if (dataKey.length !== DATA_KEY_BYTES) {
    throw new Error(`dataKey must be ${DATA_KEY_BYTES} bytes`);
  }
  return encryptBytes(dataKey, rootKey);
}

export function unwrapDataKey(wrapped: Buffer, rootKey: Buffer): Buffer {
  return decryptBytes(wrapped, rootKey);
}

export function encryptKey(plaintext: string, dataKey: Buffer): Buffer {
  return encryptBytes(Buffer.from(plaintext, "utf8"), dataKey);
}

export function decryptKey(ciphertext: Buffer, dataKey: Buffer): string {
  return decryptBytes(ciphertext, dataKey).toString("utf8");
}
