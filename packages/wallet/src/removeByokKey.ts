import { wallets } from "@platform/db";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { WALLET_CONSTANTS } from "./constants.js";
import { WalletNotFound } from "./errors.js";
import { transition } from "./transition.js";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

/**
 * Clear the stored BYOK key and run the BYOK_KEY_REMOVED state transition.
 * `platformCapHit` is computed from the wallet's current
 * lifetime_platform_key_credits_consumed and decides whether the user lands
 * back on SUBSCRIBED_PLATFORM_KEY or in EXHAUSTED.
 */
export async function removeByokKey(db: AnyPgDatabase, userId: string): Promise<void> {
  await db.transaction(
    async (tx) => {
      const walletRows = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .for("update")
        .limit(1);
      const wallet = walletRows[0];
      if (!wallet) throw new WalletNotFound(userId);

      const platformCapHit =
        wallet.lifetimePlatformKeyCreditsConsumed >= WALLET_CONSTANTS.PLATFORM_KEY_CAP_CREDITS;
      const newState = transition(wallet.state, {
        type: "BYOK_KEY_REMOVED",
        platformCapHit,
      });

      await tx
        .update(wallets)
        .set({
          byokKeyEncrypted: null,
          byokDataKeyEncrypted: null,
          state: newState,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));
    },
    { isolationLevel: "serializable" },
  );
}
