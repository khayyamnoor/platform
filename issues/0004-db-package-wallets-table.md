# 0004 — db package: Drizzle setup + `wallets` table

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0002
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
A working Drizzle setup against Neon Postgres with the `wallets` table migrated and a typed `getWallet(userId)` query.

## Scope (in)
- `packages/db` exports a Drizzle client factory `createDb(connectionString)`.
- Schema file `schema/wallets.ts` defining: `id (uuid)`, `user_id (text, unique, indexed)`, `plan (enum: FREE | STARTER_30 | PRO_60 | MAX_90)`, `state (enum: TRIAL | SUBSCRIBED_PLATFORM_KEY | SUBSCRIBED_USER_KEY | EXHAUSTED)`, `credits_remaining (integer, ≥0)`, `lifetime_platform_key_credits_consumed (integer, ≥0)`, `byok_key_encrypted (bytea, nullable)`, `byok_data_key_encrypted (bytea, nullable)`, `created_at`, `updated_at`.
- `pnpm db:migrate` script (uses `drizzle-kit`).
- Neon connection wired via `DATABASE_URL` env var; documented in `.env.example`.
- One typed query helper: `getWallet(db, userId)`.
- Test DB setup (Vitest global setup) using `pg-mem` or a Neon branch — pick `pg-mem` for v1 (faster, no network).

## Scope (out)
- `ledger_entries`, `auth_tokens`, `app_runs`, `billing_events` tables → issue 0005.
- BYOK encryption/decryption logic → issue 0011 (the `byok_*` columns are just storage shape here).

## Modules touched
| Module | Change |
|--------|--------|
| `packages/db` | NEW — Drizzle client + wallets schema + migrate script |
| Repo root | `pnpm db:migrate` script alias |
| `.env.example` | add `DATABASE_URL` |

## Test plan
- Failing test first: `getWallet(db, 'nonexistent')` returns `null`.
- Then: `insertWallet(...)` then `getWallet` returns the inserted row with all defaults applied.
- Then: `unique(user_id)` constraint rejects double-insert.
- Test boundary: `packages/db` package — black-box queries against an in-memory DB.

## Definition of done
- `pnpm db:migrate` against a fresh DB applies the wallets migration cleanly.
- All tests green.
- TypeScript types for `Wallet` and the enums exported.
