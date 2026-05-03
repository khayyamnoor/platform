# 0005 — db package: ledger, holds, runs, billing events

- **Status**: IN-REVIEW
- **Type**: AFK
- **Blocked-by**: 0004
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
The remaining four tables exist with proper indexes, constraints, and typed helpers.

## Scope (in)
- `schema/ledger_entries.ts`: `id (uuid)`, `user_id (text, FK→wallets.user_id, indexed)`, `app_id (text, nullable)`, `credits_delta (integer, signed)`, `reason (enum: AUTHORIZE | COMMIT | ROLLBACK | GRANT | EXPIRE | ADJUST)`, `ref (text — generation_id, stripe_event_id, etc.)`, `created_at`. **Append-only**: no `update`/`delete` queries should compile (helper enforces).
- `schema/auth_tokens.ts`: `id (uuid)`, `user_id (text, FK)`, `hold_credits (integer, ≥0)`, `idempotency_key (text, indexed)`, `state (enum: ACTIVE | COMMITTED | ROLLED_BACK | EXPIRED)`, `expires_at (timestamp)`, `created_at`. Unique on `(user_id, idempotency_key)`.
- `schema/app_runs.ts`: `id (uuid)`, `user_id (text, FK)`, `app_id (text)`, `gateway_request_id (text, indexed)`, `status (enum: PENDING | SUCCESS | FAILED)`, `credits_estimate`, `credits_actual (nullable)`, `error_message (text, nullable)`, `created_at`, `completed_at (nullable)`.
- `schema/billing_events.ts`: `stripe_event_id (text, primary key)`, `event_type (text)`, `processed_at (timestamp)`, `payload_json (jsonb)`. Used for webhook idempotency.
- All FKs `ON DELETE CASCADE` (so deleting a user wipes the cascade — Clerk user deletion webhook will trigger this in a later slice).
- Migration applied cleanly on top of 0004.

## Scope (out)
- Mutation helpers for these tables (those land with `wallet` package in 0009/0010/0011).
- Any business logic — only schema + read helpers here.

## Modules touched
| Module | Change |
|--------|--------|
| `packages/db` | + 4 schema files + read helpers |

## Test plan
- Failing tests first: insertion violations (FK miss, negative credits, duplicate idempotency_key) all reject.
- Append-only invariant: a TypeScript test asserting no `update(ledgerEntries)` or `delete(ledgerEntries)` is exported from the package.
- Test boundary: `packages/db`.

## Definition of done
- All migrations apply cleanly to a fresh DB and incrementally on top of 0004.
- TypeScript types for all rows exported from the package index.
- All tests green.
