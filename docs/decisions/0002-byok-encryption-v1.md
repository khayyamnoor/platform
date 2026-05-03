# ADR 0002 — BYOK key encryption (v1: env-var root key + per-user data keys)

- **Status**: Accepted
- **Date**: 2026-05-03
- **Issue**: `issues/closed/0011-wallet-byok-encryption.md`
- **Replaces**: none
- **Will be replaced by**: ADR for KMS migration in v1.5

## Context

The platform stores user-supplied Gemini API keys (BYOK) so that, when a subscriber crosses the platform-key cap (PRD decision: 2000 credits = $10), they can keep generating against their own key instead of running out of usage. The key has direct billing implications: if it leaks, an attacker bills the user, not us. Storing it in plaintext is unacceptable; storing it encrypted with a single shared key is the floor.

We need a v1 design that:

1. Encrypts each user's key at rest in a way that a database leak alone is insufficient to recover plaintexts.
2. Lets only one specific module (`gemini-gateway`) decrypt and use the plaintext, never the rest of the application code.
3. Has an easy upgrade path to a real KMS in v1.5 once the wedge has paying customers.

## Decision

Two-layer envelope encryption with **AES-256-GCM** (12-byte IV, 16-byte auth tag, no version byte yet — when we rotate to v2 we prepend a 1-byte version):

```
   plaintext ─── encrypt(data_key) ───▶  byok_key_encrypted (bytea)
   data_key  ─── encrypt(root_key) ───▶  byok_data_key_encrypted (bytea)
                                          (both stored on the wallet row)

   root_key  =  base64-decoded BYOK_ENCRYPTION_ROOT_KEY env var (32 bytes)
   data_key  =  randomBytes(32), generated fresh every addByokKey call
```

A *fresh* per-user data key is generated on every `addByokKey` call. A user replacing their key gets a new data key; two users with the identical plaintext key get different ciphertexts.

The root key is loaded from `BYOK_ENCRYPTION_ROOT_KEY` and validated at module load — wrong format throws `RootKeyMisconfigured` synchronously at import time, before any encrypt/decrypt code path can run. Tests confirm this; the production app will crash on boot if misconfigured rather than silently mis-encrypting.

## Threat model

### Protected against

- **Database leak.** The DB rows contain only ciphertexts. The wrapping root key is in env (Vercel encrypted env), never in the DB. An attacker with a full pg_dump cannot recover any plaintext key without also having the deployment's environment.
- **Backup leak.** Same argument: a leaked Neon backup contains only ciphertexts.
- **Per-user blast radius.** If one user's data key is somehow exposed, only that user's plaintext is at risk; other users are encrypted under different data keys.
- **Tampering.** AES-GCM's auth tag rejects any modified ciphertext (including the IV). Tested.
- **App-code accidental misuse.** `getDecryptedByokKey` lives at the subpath `@platform/wallet/internal-byok`, and a Biome `noRestrictedImports` rule rejects that import path everywhere except `packages/gemini-gateway/**`. CI catches a stray `import` from app code.

### NOT protected against (accept until v1.5)

- **Compromised app server.** Anyone with code-execution on a running Vercel function has both the root key (in env) and the DB; they can decrypt every user's key. Mitigated post-v1.5 by KMS — at that point the root key never exists outside KMS, and decryption requires a KMS API call (audit-logged, rate-limited).
- **Malicious operator with both DB and env access.** Same as above. Operationally restricted by Vercel + Neon access controls; verified at v1.5.
- **Memory dumps.** A heap snapshot during a `gemini-gateway` request will contain plaintext for the lifetime of that request (~5 seconds). We deliberately do not zero buffers because JS strings are immutable and Buffer.fill on the underlying allocation is best-effort. If this becomes a real concern, move plaintext access into a native module that handles its own memory.
- **Side-channel timing on the auth tag check.** Node's `crypto.createDecipheriv` exposes whatever timing properties OpenSSL has; we treat that as out of scope for v1.

## Why these specific choices

- **AES-256-GCM** (not AES-CBC + HMAC, not ChaCha20-Poly1305). GCM is in `node:crypto`, AEAD by default (no separate MAC step), and the de facto standard for envelope encryption. ChaCha20-Poly1305 would also work; AES-GCM has slightly broader hardware acceleration.
- **Per-user data keys**, not direct encryption with the root key. (a) Two users with the same plaintext get different ciphertexts. (b) Per-user re-encryption (key rotation, future re-wrapping under KMS) only touches that user's row. (c) Easy migration to KMS: only data keys ever get re-wrapped; the user's actual stored ciphertext is unchanged.
- **Env-var root key, not KMS** (yet). KMS adds latency (~50ms per decrypt), an operational dependency, and a billing line for v1. Until the wedge has paying users we accept the risk that the root key exists in environment variables. Migration path is well-trodden: change `getRootKey()` to call KMS instead of reading env, re-wrap every existing `byok_data_key_encrypted` once, ship.
- **No version byte (yet)** in the wire format. We will need one for KMS migration; we avoid wasting bytes now and document that v2 prepends a 1-byte version.

## Public API surface

```
addByokKey(db, { userId, plaintextKey })   // wallet — generates dk, wraps, stores, transitions state
removeByokKey(db, userId)                  // wallet — clears columns, transitions state
getDecryptedByokKey(db, userId)            // gemini-gateway only (subpath import)
```

Plaintext only ever leaves the wallet package via the `@platform/wallet/internal-byok` subpath. Caller (gateway) is contractually obliged to:

- Never log, never serialize, never embed in error messages.
- Use the value within the request that fetched it; do not retain.
- Catch errors locally — the plaintext must not appear in any rejected promise's reason chain.

These obligations are documented in `internal-byok.ts`; CI enforces the import scope.

## Test coverage

`packages/wallet/src/encryption.test.ts` (14 tests):
- root-key validation: 32-byte base64 OK; missing/empty/non-base64/wrong-length all throw `RootKeyMisconfigured`
- wrap/unwrap round-trip; randomized IV produces different ciphertexts
- unwrap with wrong root key → auth tag rejection
- encryptKey/decryptKey round-trip a real-shaped Gemini key (`AIzaSy…`)
- decrypt with wrong data key → throws
- two users with same plaintext → different ciphertexts
- single-byte tamper of ciphertext → auth tag rejection

`packages/wallet/src/byok.test.ts` (12 tests):
- addByokKey populates both columns; state transitions PLATFORM_KEY → USER_KEY (and EXHAUSTED → USER_KEY)
- TRIAL throws `InvalidWalletTransition` (FSM unchanged from 0009)
- two users with same plaintext → different stored ciphertexts (per-user data keys)
- removeByokKey clears both columns; state transitions back via FSM (USER_KEY → PLATFORM_KEY or EXHAUSTED depending on lifetime)
- getDecryptedByokKey returns the original plaintext; isolates per-user; throws on missing wallet / missing key / after remove

## Migration to v1.5 (KMS)

When MRR justifies it:

1. Provision AWS KMS or GCP KMS, create a CMK.
2. Replace `getRootKey()` body with a KMS data-key fetch (cache the data-encryption-key locally for the request's lifetime).
3. One-shot script: for each wallet with `byok_data_key_encrypted`, unwrap with the env root key, re-wrap with KMS, write back. Use `byok_data_key_encrypted_version = 2` to signal which scheme owns each row.
4. After verifying every row is v2, retire the env-var root key.

No user-visible change. Same APIs.

## Follow-ups

- Add the version byte to the wire format on the next breaking change.
- File a follow-up issue: "key rotation playbook" — generate a new data key per wallet on a schedule, re-wrap, verify decryption, drop the old. Covers data-key compromise without rotating root.
- Add a CI check that greps for `getDecryptedByokKey` outside `packages/gemini-gateway/**` and fails the build (defense-in-depth on top of the Biome rule).
