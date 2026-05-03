import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { type NewWallet, type Wallet, wallets } from "./schema/wallets.js";

export const PACKAGE_NAME = "@platform/db" as const;

export type Db = ReturnType<typeof createDb>;
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema: { wallets } });
}

export async function getWallet(db: AnyPgDatabase, userId: string): Promise<Wallet | null> {
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function insertWallet(db: AnyPgDatabase, values: NewWallet): Promise<void> {
  await db.insert(wallets).values(values);
}

export {
  type NewWallet,
  type Wallet,
  type WalletPlan,
  type WalletState,
  wallets,
  walletPlanEnum,
  walletStateEnum,
} from "./schema/wallets.js";
