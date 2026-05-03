import { authTokens, ledgerEntries, wallets } from "@platform/db";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { WALLET_CONSTANTS } from "./constants.js";
import { AuthTokenNotFound, TokenNotActive, WalletNotFound } from "./errors.js";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export type CommitArgs = {
  tokenId: string;
  actualCredits: number;
  /** True if the request actually executed against the platform Gemini key. */
  usedPlatformKey: boolean;
};

/**
 * Finalise an authorised hold. Inside a SERIALIZABLE transaction:
 *   - mark the auth_token COMMITTED;
 *   - reconcile credits_remaining by (estimate − actual): refund if actual was
 *     smaller, debit further if actual was larger (allowed to go negative);
 *   - if the call used the platform key, increment lifetime consumption by
 *     `actualCredits`; if that crosses the cap and the wallet is still on the
 *     platform key, transition state to EXHAUSTED;
 *   - record a single COMMIT ledger entry whose delta carries the diff
 *     (positive = refund, negative = extra debit, 0 = exact match).
 */
export async function commit(
  db: AnyPgDatabase,
  { tokenId, actualCredits, usedPlatformKey }: CommitArgs,
): Promise<void> {
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

      const diff = actualCredits - token.holdCredits;
      const newCredits = wallet.creditsRemaining - diff;

      const newLifetime = usedPlatformKey
        ? wallet.lifetimePlatformKeyCreditsConsumed + actualCredits
        : wallet.lifetimePlatformKeyCreditsConsumed;

      const newState =
        usedPlatformKey &&
        wallet.state === "SUBSCRIBED_PLATFORM_KEY" &&
        newLifetime >= WALLET_CONSTANTS.PLATFORM_KEY_CAP_CREDITS
          ? "EXHAUSTED"
          : wallet.state;

      await tx
        .update(wallets)
        .set({
          creditsRemaining: newCredits,
          lifetimePlatformKeyCreditsConsumed: newLifetime,
          state: newState,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, token.userId));

      await tx.update(authTokens).set({ state: "COMMITTED" }).where(eq(authTokens.id, token.id));

      await tx.insert(ledgerEntries).values({
        userId: token.userId,
        creditsDelta: -diff,
        reason: "COMMIT",
        ref: token.id,
      });
    },
    { isolationLevel: "serializable" },
  );
}
