# 0011 — wallet package: BYOK key add/remove + encryption + ADR

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0010
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
Users can store and remove a BYOK Gemini key. The key is encrypted at rest and only decryptable by `gemini-gateway` at request time.

## Scope (in)
- `packages/wallet/src/encryption.ts`: AES-256-GCM helpers using Node's `crypto.subtle`.
  - Per-user data keys: 32-byte random key generated when user first adds a BYOK key.
  - Data key wrapped (encrypted) by the platform root key from `BYOK_ENCRYPTION_ROOT_KEY` env var (32 bytes base64).
  - Functions: `wrapDataKey`, `unwrapDataKey`, `encryptKey(plaintext, dataKey)`, `decryptKey(ciphertext, dataKey)`.
  - All ciphertexts include AES-GCM IV + auth tag.
- `packages/wallet/src/addByokKey.ts`: `addByokKey(db, {userId, plaintextKey}): Promise<void>`.
  - Generates per-user data key if absent.
  - Encrypts `plaintextKey` with the data key.
  - Stores `byok_key_encrypted` and `byok_data_key_encrypted` on the wallet.
  - Triggers state transition `BYOK_KEY_ADDED`.
- `packages/wallet/src/removeByokKey.ts`: clears both columns; transitions per state machine.
- `packages/wallet/src/getDecryptedByokKey.ts`: **only callable from `gemini-gateway`** (we'll enforce by package-private export — see DoD). Returns plaintext as a string for the caller to use, but the value must not be retained or logged. Function returns within a 5-second window; caller responsible for not holding it.
- ADR `docs/decisions/0002-byok-encryption-v1.md`: documents the choice (per-user data keys, env-var root key for v1, KMS for v1.5). Includes threat model: what's protected against (DB leak, backup leak), what's not (compromised app server, malicious operator).

## Scope (out)
- KMS integration — its own ADR and follow-up issue post-launch.
- Per-call test validation — happens in `gemini-gateway` (issue 0014) and the modal UX (issue 0022).

## Modules touched
| Module | Change |
|--------|--------|
| `packages/wallet` | + encryption + addByokKey + removeByokKey + getDecryptedByokKey |
| `docs/decisions/0002-byok-encryption-v1.md` | NEW |
| `.env.example` | + `BYOK_ENCRYPTION_ROOT_KEY` |

## Test plan
- Failing tests first:
  1. `wrapDataKey` then `unwrapDataKey` round-trips to the original 32 bytes.
  2. `encryptKey` then `decryptKey` round-trips a real-shaped Gemini key (`AIzaSy...` 39 chars).
  3. Decrypting with the wrong root key fails (auth-tag rejection).
  4. `addByokKey` populates both columns and transitions state correctly.
  5. `removeByokKey` clears both columns.
  6. Two users adding the same plaintext key produce different ciphertexts (per-user data keys → unique IVs).
  7. A malformed env-var root key fails fast at module load (not at first decrypt).
- Test boundary: `packages/wallet`.

## Definition of done
- All tests green.
- ADR 0002 filed and reviewed.
- `getDecryptedByokKey` is package-private — exported only via a marker file imported by `gemini-gateway` (a Biome rule rejects imports from anywhere else).
- No plaintext key value ever passed to a logger or thrown in an error message; lint rule asserts this.
