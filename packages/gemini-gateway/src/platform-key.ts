/**
 * GEMINI_PLATFORM_KEY is read once at module init and held in module scope.
 * It is never logged, never embedded in error messages, never returned to
 * callers — only passed to the Gemini SDK constructor inside clientForRequest.
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

const PLATFORM_KEY = validatePlatformKey(process.env.GEMINI_PLATFORM_KEY);

export function getPlatformKey(): string {
  return PLATFORM_KEY;
}
