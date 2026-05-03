import { Buffer } from "node:buffer";
import { describe, expect, test } from "vitest";
import {
  RootKeyMisconfigured,
  decryptKey,
  encryptKey,
  generateDataKey,
  unwrapDataKey,
  validateRootKey,
  wrapDataKey,
} from "./encryption/index.js";

const REAL_GEMINI_KEY_SHAPE = `AIzaSy${"x".repeat(33)}`; // 39 chars, like real keys

describe("validateRootKey (eager validation)", () => {
  test("32-byte base64 → returns a 32-byte buffer", () => {
    const raw = Buffer.alloc(32, 0x11).toString("base64");
    expect(validateRootKey(raw).length).toBe(32);
  });

  test.each([
    ["unset", undefined],
    ["empty", ""],
    ["non-base64 garbage", "not\nvalid base64!@#"],
    ["only 16 bytes", Buffer.alloc(16, 0).toString("base64")],
    ["64 bytes", Buffer.alloc(64, 0).toString("base64")],
  ])("%s → throws RootKeyMisconfigured", (_label, value) => {
    expect(() => validateRootKey(value)).toThrow(RootKeyMisconfigured);
  });
});

describe("wrapDataKey / unwrapDataKey", () => {
  const rootKey = Buffer.alloc(32, 0xab);

  test("round-trips a freshly generated 32-byte data key", () => {
    const dataKey = generateDataKey();
    const wrapped = wrapDataKey(dataKey, rootKey);
    const unwrapped = unwrapDataKey(wrapped, rootKey);
    expect(unwrapped.equals(dataKey)).toBe(true);
  });

  test("each wrap produces a different ciphertext (random IV)", () => {
    const dataKey = generateDataKey();
    const a = wrapDataKey(dataKey, rootKey);
    const b = wrapDataKey(dataKey, rootKey);
    expect(a.equals(b)).toBe(false);
  });

  test("unwrap with the wrong root key throws (auth-tag rejection)", () => {
    const dataKey = generateDataKey();
    const wrapped = wrapDataKey(dataKey, rootKey);
    const wrongKey = Buffer.alloc(32, 0xcd);
    expect(() => unwrapDataKey(wrapped, wrongKey)).toThrow();
  });
});

describe("encryptKey / decryptKey", () => {
  test("round-trips a Gemini-shaped key string", () => {
    const dataKey = generateDataKey();
    const ciphertext = encryptKey(REAL_GEMINI_KEY_SHAPE, dataKey);
    expect(decryptKey(ciphertext, dataKey)).toBe(REAL_GEMINI_KEY_SHAPE);
  });

  test("ciphertext is not the plaintext (sanity)", () => {
    const dataKey = generateDataKey();
    const ciphertext = encryptKey(REAL_GEMINI_KEY_SHAPE, dataKey);
    expect(ciphertext.toString("utf8")).not.toContain("AIzaSy");
  });

  test("decrypt with the wrong data key throws", () => {
    const dataKeyA = generateDataKey();
    const dataKeyB = generateDataKey();
    const ciphertext = encryptKey(REAL_GEMINI_KEY_SHAPE, dataKeyA);
    expect(() => decryptKey(ciphertext, dataKeyB)).toThrow();
  });

  test("two users with the same plaintext key produce different ciphertexts", () => {
    // Per-user data keys are different ⇒ ciphertexts are different even for
    // the identical plaintext, even ignoring random IVs.
    const userAKey = generateDataKey();
    const userBKey = generateDataKey();
    const cipherA = encryptKey(REAL_GEMINI_KEY_SHAPE, userAKey);
    const cipherB = encryptKey(REAL_GEMINI_KEY_SHAPE, userBKey);
    expect(cipherA.equals(cipherB)).toBe(false);
  });

  test("tampering with any byte of the ciphertext fails the auth tag", () => {
    const dataKey = generateDataKey();
    const ciphertext = Buffer.from(encryptKey(REAL_GEMINI_KEY_SHAPE, dataKey));
    const middle = Math.floor(ciphertext.length / 2);
    ciphertext[middle] = (ciphertext[middle] ?? 0) ^ 0xff;
    expect(() => decryptKey(ciphertext, dataKey)).toThrow();
  });
});
