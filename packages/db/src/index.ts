import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { appRuns } from "./schema/app-runs.js";
import { authTokens } from "./schema/auth-tokens.js";
import { billingEvents } from "./schema/billing-events.js";
import type {
  NewAppRun,
  NewAuthToken,
  NewBillingEvent,
  NewLedgerEntry,
  NewWallet,
} from "./schema/index.js";
import type { AppRun, AuthToken, BillingEvent, LedgerEntry, Wallet } from "./schema/index.js";
import { ledgerEntries } from "./schema/ledger-entries.js";
import { wallets } from "./schema/wallets.js";

export const PACKAGE_NAME = "@platform/db" as const;

export type Db = ReturnType<typeof createDb>;
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool, {
    schema: {
      wallets,
      ledgerEntries,
      authTokens,
      appRuns,
      billingEvents,
    },
  });
}

// --- wallets ---------------------------------------------------------------

export async function getWallet(db: AnyPgDatabase, userId: string): Promise<Wallet | null> {
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function insertWallet(db: AnyPgDatabase, values: NewWallet): Promise<void> {
  await db.insert(wallets).values(values);
}

/**
 * Provision a fresh wallet for a new user with the slice-1 trial defaults
 * (FREE plan, TRIAL state, 1000 free credits). Thin wrapper around
 * insertWallet — kept as a separate export so apps/web's first-signin path
 * doesn't need to know the magic-number defaults inline.
 */
export async function createWallet(db: AnyPgDatabase, args: { userId: string }): Promise<Wallet> {
  await db.insert(wallets).values({
    userId: args.userId,
    plan: "FREE",
    state: "TRIAL",
    creditsRemaining: 1000,
  });
  const wallet = await getWallet(db, args.userId);
  if (!wallet)
    throw new Error(`createWallet: insert succeeded but wallet missing for ${args.userId}`);
  return wallet;
}

// --- ledger_entries (append-only: no update/delete helpers) -----------------

export async function insertLedgerEntry(db: AnyPgDatabase, values: NewLedgerEntry): Promise<void> {
  await db.insert(ledgerEntries).values(values);
}

export async function getLedgerEntriesForUser(
  db: AnyPgDatabase,
  userId: string,
): Promise<LedgerEntry[]> {
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.userId, userId));
}

// --- auth_tokens ------------------------------------------------------------

export async function insertAuthToken(db: AnyPgDatabase, values: NewAuthToken): Promise<void> {
  await db.insert(authTokens).values(values);
}

export async function getAuthToken(
  db: AnyPgDatabase,
  userId: string,
  idempotencyKey: string,
): Promise<AuthToken | null> {
  const rows = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.idempotencyKey, idempotencyKey)))
    .limit(1);
  return rows[0] ?? null;
}

// --- app_runs ---------------------------------------------------------------

export async function insertAppRun(db: AnyPgDatabase, values: NewAppRun): Promise<void> {
  await db.insert(appRuns).values(values);
}

export async function getAppRun(db: AnyPgDatabase, id: string): Promise<AppRun | null> {
  const rows = await db.select().from(appRuns).where(eq(appRuns.id, id)).limit(1);
  return rows[0] ?? null;
}

// --- billing_events ---------------------------------------------------------

export async function insertBillingEvent(
  db: AnyPgDatabase,
  values: NewBillingEvent,
): Promise<void> {
  await db.insert(billingEvents).values(values);
}

export async function getBillingEvent(
  db: AnyPgDatabase,
  stripeEventId: string,
): Promise<BillingEvent | null> {
  const rows = await db
    .select()
    .from(billingEvents)
    .where(eq(billingEvents.stripeEventId, stripeEventId))
    .limit(1);
  return rows[0] ?? null;
}

// --- re-exports -------------------------------------------------------------

export {
  type AppRun,
  type AppRunStatus,
  type AuthToken,
  type AuthTokenState,
  type BillingEvent,
  type LedgerEntry,
  type LedgerReason,
  type NewAppRun,
  type NewAuthToken,
  type NewBillingEvent,
  type NewLedgerEntry,
  type NewWallet,
  type Wallet,
  type WalletPlan,
  type WalletState,
  appRunStatusEnum,
  appRuns,
  authTokenStateEnum,
  authTokens,
  billingEvents,
  ledgerEntries,
  ledgerReasonEnum,
  wallets,
  walletPlanEnum,
  walletStateEnum,
} from "./schema/index.js";
