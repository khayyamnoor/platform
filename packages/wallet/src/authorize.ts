import { type AuthToken, authTokens, ledgerEntries, wallets } from "@platform/db";
import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { WALLET_CONSTANTS } from "./constants.js";
import { CapReached, InsufficientCredits, WalletNotFound } from "./errors.js";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

const HOLD_TTL_MS = 30_000;

export type AuthorizeArgs = {
  userId: string;
  estimateCredits: number;
  idempotencyKey: string;
};

/**
 * Authorise a credit hold. Inside a SERIALIZABLE transaction:
 *   1. If a token already exists for (userId, idempotencyKey), return it (idempotent retry).
 *   2. Read wallet FOR UPDATE.
 *   3. Reject if balance < estimate (`InsufficientCredits`).
 *   4. Reject if estimate would push platform-key lifetime past the cap and the
 *      wallet is currently on the platform key (`CapReached`).
 *   5. Decrement credits_remaining; insert auth_tokens + ledger_entries (AUTHORIZE).
 */
export async function authorize(
  db: AnyPgDatabase,
  { userId, estimateCredits, idempotencyKey }: AuthorizeArgs,
): Promise<AuthToken> {
  return db.transaction(
    async (tx) => {
      const existing = await tx
        .select()
        .from(authTokens)
        .where(and(eq(authTokens.userId, userId), eq(authTokens.idempotencyKey, idempotencyKey)))
        .limit(1);
      if (existing[0]) return existing[0];

      const walletRows = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .for("update")
        .limit(1);
      const wallet = walletRows[0];
      if (!wallet) throw new WalletNotFound(userId);

      if (wallet.creditsRemaining < estimateCredits) {
        throw new InsufficientCredits(userId, wallet.creditsRemaining, estimateCredits);
      }

      if (wallet.state === "SUBSCRIBED_PLATFORM_KEY") {
        const lifetimeAfter = wallet.lifetimePlatformKeyCreditsConsumed + estimateCredits;
        if (lifetimeAfter > WALLET_CONSTANTS.PLATFORM_KEY_CAP_CREDITS) {
          throw new CapReached(userId, lifetimeAfter, WALLET_CONSTANTS.PLATFORM_KEY_CAP_CREDITS);
        }
      }

      await tx
        .update(wallets)
        .set({
          creditsRemaining: wallet.creditsRemaining - estimateCredits,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));

      const inserted = await tx
        .insert(authTokens)
        .values({
          userId,
          holdCredits: estimateCredits,
          idempotencyKey,
          expiresAt: new Date(Date.now() + HOLD_TTL_MS),
        })
        .returning();
      const token = inserted[0];
      if (!token) throw new Error("authTokens.insert returned no row");

      await tx.insert(ledgerEntries).values({
        userId,
        creditsDelta: -estimateCredits,
        reason: "AUTHORIZE",
        ref: token.id,
      });

      return token;
    },
    { isolationLevel: "serializable" },
  );
}
