/**
 * Lazy GEMINI_PLATFORM_KEY validation. Same pattern as wallet's
 * `getRootKey()` — validated on first call, not at module-graph load,
 * so `next build` can introspect routes without env vars set. Failure
 * still happens before any Gemini call (the gateway runs through
 * `getPlatformKey()` on every platform-key request).
 *
 * The plaintext key value is never logged, never embedded in error
 * messages, never returned to non-gateway callers.
 */

export class PlatformKeyMisconfigured extends Error {
  constructor(reason: string) {
    super(`GEMINI_PLATFORM_KEY is misconfigured: ${reason}`);
    this.name = "PlatformKeyMisconfigured";
  }
}

export function validatePlatformKey(raw: string | undefined): string {
  if (!raw || raw.length === 0) {
    throw new PlatformKeyMisconfigured("env var is unset or empty");
  }
  // Real Gemini keys start AIzaSy and are 39 chars; do not enforce that
  // shape strictly — accept anything non-empty so test fixtures work.
  return raw;
}

let PLATFORM_KEY: string | null = null;

export function getPlatformKey(): string {
  if (PLATFORM_KEY === null) {
    PLATFORM_KEY = validatePlatformKey(process.env.GEMINI_PLATFORM_KEY);
  }
  return PLATFORM_KEY;
}

/** Test-only. */
export function _resetPlatformKeyForTests(): void {
  PLATFORM_KEY = null;
}
