import { wallets } from "@platform/db";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { encryptKey, generateDataKey, getRootKey, wrapDataKey } from "./encryption/index.js";
import { WalletNotFound } from "./errors.js";
import { transition } from "./transition.js";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export type AddByokKeyArgs = {
  userId: string;
  plaintextKey: string;
};

/**
 * Encrypt and store a BYOK Gemini key. Inside SERIALIZABLE:
 *   1. SELECT wallet FOR UPDATE.
 *   2. Generate a fresh per-user data key, wrap with the root key.
 *   3. Encrypt the plaintext API key with the data key.
 *   4. Apply BYOK_KEY_ADDED state transition (throws InvalidWalletTransition
 *      from any state where it is not allowed — e.g. TRIAL).
 *   5. UPDATE wallets with new ciphertexts + new state.
 *
 * The plaintext key is only in memory for the duration of this function call;
 * it is not logged, not stored, and not returned.
 */
export async function addByokKey(
  db: AnyPgDatabase,
  { userId, plaintextKey }: AddByokKeyArgs,
): Promise<void> {
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

      const newState = transition(wallet.state, { type: "BYOK_KEY_ADDED" });

      const dataKey = generateDataKey();
      const wrappedDataKey = wrapDataKey(dataKey, getRootKey());
      const encryptedKey = encryptKey(plaintextKey, dataKey);

      await tx
        .update(wallets)
        .set({
          byokKeyEncrypted: encryptedKey,
          byokDataKeyEncrypted: wrappedDataKey,
          state: newState,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));
    },
    { isolationLevel: "serializable" },
  );
}
