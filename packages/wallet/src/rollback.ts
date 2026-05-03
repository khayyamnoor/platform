import { authTokens, ledgerEntries, wallets } from "@platform/db";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { AuthTokenNotFound, TokenNotActive, WalletNotFound } from "./errors.js";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

/**
 * Roll back an authorised hold and refund the full hold amount.
 * Inside a SERIALIZABLE transaction:
 *   - mark the auth_token ROLLED_BACK;
 *   - add holdCredits back to credits_remaining;
 *   - record a ROLLBACK ledger entry (positive delta = full refund).
 */
export async function rollback(db: AnyPgDatabase, tokenId: string): Promise<void> {
  await db.transaction(
    async (tx) => {
      const tokenRows = await tx
        .select()
        .from(authTokens)
        .where(eq(authTokens.id, tokenId))
        .for("update")
        .limit(1);
      const token = tokenRows[0];
      if (!token) throw new AuthTokenNotFound(tokenId);
      if (token.state !== "ACTIVE") throw new TokenNotActive(tokenId, token.state);

      const walletRows = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, token.userId))
        .for("update")
        .limit(1);
      const wallet = walletRows[0];
      if (!wallet) throw new WalletNotFound(token.userId);

      await tx
        .update(wallets)
        .set({
          creditsRemaining: wallet.creditsRemaining + token.holdCredits,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, token.userId));

      await tx.update(authTokens).set({ state: "ROLLED_BACK" }).where(eq(authTokens.id, token.id));

      await tx.insert(ledgerEntries).values({
        userId: token.userId,
        creditsDelta: token.holdCredits,
        reason: "ROLLBACK",
        ref: token.id,
      });
    },
    { isolationLevel: "serializable" },
  );
}
