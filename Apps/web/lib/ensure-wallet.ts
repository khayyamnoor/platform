import "server-only";

import { type Wallet, createWallet, getWallet } from "@platform/db";
import { getDb } from "./db";

/**
 * Idempotent wallet provisioner. Returns the user's wallet, creating a
 * fresh FREE/TRIAL/1000-credit one on first sign-in.
 *
 * Called from the (shell) layout once per request — every protected route
 * that uses the shell sees a guaranteed-non-null wallet. Race-safe via the
 * unique(user_id) constraint on wallets: if two requests fire in parallel,
 * the loser's INSERT throws and the retry path picks up the existing row.
 */
export async function ensureWallet(userId: string): Promise<Wallet> {
  const db = getDb();
  const existing = await getWallet(db, userId);
  if (existing) return existing;

  try {
    return await createWallet(db, { userId });
  } catch (err) {
    // Race: another request created the wallet between our SELECT and INSERT.
    // Retry the read; if still missing, the original error wasn't a uniqueness
    // collision and should propagate.
    const after = await getWallet(db, userId);
    if (after) return after;
    throw err;
  }
}
