import { getWallet } from "@platform/db";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { WalletNotFound } from "./errors.js";
import type { Balance } from "./types.js";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export async function getBalance(db: AnyPgDatabase, userId: string): Promise<Balance> {
  const wallet = await getWallet(db, userId);
  if (!wallet) throw new WalletNotFound(userId);
  return {
    credits: wallet.creditsRemaining,
    plan: wallet.plan,
    state: wallet.state,
    lifetimePlatformKeyCredits: wallet.lifetimePlatformKeyCreditsConsumed,
    byokKeyPresent: wallet.byokKeyEncrypted !== null,
  };
}
