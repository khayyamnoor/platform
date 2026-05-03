/**
 * PACKAGE-PRIVATE: importable only from `@platform/gemini-gateway`.
 *
 * Enforced two ways:
 *   1. Subpath export `@platform/wallet/internal-byok` — the path itself
 *      signals "do not use from app code."
 *   2. Biome `noRestrictedImports` rule blocks this path everywhere except
 *      `packages/gemini-gateway/**` (see biome.json overrides).
 *
 * The plaintext key value returned here:
 *   - MUST NOT be retained beyond the request that needed it
 *   - MUST NOT be logged or sent to observability
 *   - MUST NOT be embedded in error messages
 */
import { wallets } from "@platform/db";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { decryptKey, getRootKey, unwrapDataKey } from "./encryption/index.js";
import { WalletNotFound } from "./errors.js";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export class ByokKeyNotPresent extends Error {
  readonly userId: string;
  constructor(userId: string) {
    super(`No BYOK key stored for userId=${userId}`);
    this.name = "ByokKeyNotPresent";
    this.userId = userId;
  }
}

/**
 * Read + decrypt the stored Gemini key for a user. Returns the plaintext
 * within ~5ms and never holds it after return. Caller is responsible for not
 * retaining or logging the returned value.
 */
export async function getDecryptedByokKey(db: AnyPgDatabase, userId: string): Promise<string> {
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  const wallet = rows[0];
  if (!wallet) throw new WalletNotFound(userId);
  if (!wallet.byokKeyEncrypted || !wallet.byokDataKeyEncrypted) {
    throw new ByokKeyNotPresent(userId);
  }

  const dataKey = unwrapDataKey(wallet.byokDataKeyEncrypted, getRootKey());
  return decryptKey(wallet.byokKeyEncrypted, dataKey);
}
