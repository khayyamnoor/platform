import { authTokens, ledgerEntries, wallets } from "@platform/db";
import { and, eq, lt } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

/**
 * Sweep auth_tokens whose state is ACTIVE and whose expires_at has passed.
 * For each, refund the held credits and mark the token EXPIRED. Designed to
 * be invoked from a Vercel Cron entry; safe to call at any cadence.
 *
 * Returns the number of holds expired in this sweep.
 */
export async function expireHolds(db: AnyPgDatabase): Promise<{ expired: number }> {
  return db.transaction(
    async (tx) => {
      const now = new Date();
      const expired = await tx
        .select()
        .from(authTokens)
        .where(and(eq(authTokens.state, "ACTIVE"), lt(authTokens.expiresAt, now)))
        .for("update");

      for (const token of expired) {
        const walletRows = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, token.userId))
          .for("update")
          .limit(1);
        const wallet = walletRows[0];
        if (!wallet) continue;

        await tx
          .update(wallets)
          .set({
            creditsRemaining: wallet.creditsRemaining + token.holdCredits,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, token.userId));

        await tx.update(authTokens).set({ state: "EXPIRED" }).where(eq(authTokens.id, token.id));

        await tx.insert(ledgerEntries).values({
          userId: token.userId,
          creditsDelta: token.holdCredits,
          reason: "EXPIRE",
          ref: token.id,
        });
      }

      return { expired: expired.length };
    },
    { isolationLevel: "serializable" },
  );
}
