import {
  authTokens,
  getLedgerEntriesForUser,
  insertWallet,
  ledgerEntries,
  wallets,
} from "@platform/db";
import { type TestDb, createTestDb } from "@platform/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { authorize } from "./authorize.js";
import { commit } from "./commit.js";
import { WALLET_CONSTANTS } from "./constants.js";
import { AuthTokenNotFound, CapReached, InsufficientCredits, TokenNotActive } from "./errors.js";
import { expireHolds } from "./expireHolds.js";
import { getBalance } from "./getBalance.js";
import { rollback } from "./rollback.js";

const USER = "user_a";

describe("wallet ops", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  // ---------------------------------------------------------------- 1
  test("authorize on insufficient balance throws INSUFFICIENT_CREDITS and does not mutate", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 5 });

    await expect(
      authorize(testDb.db, { userId: USER, estimateCredits: 10, idempotencyKey: "k1" }),
    ).rejects.toBeInstanceOf(InsufficientCredits);

    const balance = await getBalance(testDb.db, USER);
    expect(balance.credits).toBe(5);

    const tokens = await testDb.db.select().from(authTokens);
    expect(tokens).toHaveLength(0);
    const ledger = await getLedgerEntriesForUser(testDb.db, USER);
    expect(ledger).toHaveLength(0);
  });

  // ---------------------------------------------------------------- 2
  test("authorize → commit with smaller actual refunds the diff", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 100 });
    const token = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 20,
      idempotencyKey: "k_small",
    });
    expect((await getBalance(testDb.db, USER)).credits).toBe(80);

    await commit(testDb.db, { tokenId: token.id, actualCredits: 12, usedPlatformKey: false });

    expect((await getBalance(testDb.db, USER)).credits).toBe(88); // 100 − 12
    const ledger = await getLedgerEntriesForUser(testDb.db, USER);
    expect(ledger.find((l) => l.reason === "AUTHORIZE")?.creditsDelta).toBe(-20);
    expect(ledger.find((l) => l.reason === "COMMIT")?.creditsDelta).toBe(8); // refund 8
  });

  // ---------------------------------------------------------------- 3
  test("authorize → commit with larger actual debits the diff (allowed to underrun)", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 100 });
    const token = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 20,
      idempotencyKey: "k_large",
    });

    await commit(testDb.db, { tokenId: token.id, actualCredits: 25, usedPlatformKey: false });

    expect((await getBalance(testDb.db, USER)).credits).toBe(75); // 100 − 25
    const ledger = await getLedgerEntriesForUser(testDb.db, USER);
    expect(ledger.find((l) => l.reason === "COMMIT")?.creditsDelta).toBe(-5); // extra debit
  });

  // ---------------------------------------------------------------- 4
  test("authorize → rollback returns balance to original", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 100 });
    const token = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 20,
      idempotencyKey: "k_rb",
    });
    expect((await getBalance(testDb.db, USER)).credits).toBe(80);

    await rollback(testDb.db, token.id);
    expect((await getBalance(testDb.db, USER)).credits).toBe(100);

    const tokenRow = await testDb.db.select().from(authTokens).where(eq(authTokens.id, token.id));
    expect(tokenRow[0]?.state).toBe("ROLLED_BACK");
  });

  // ---------------------------------------------------------------- 5
  test("100 parallel authorize calls totalling more than balance: exactly the right number succeed", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 50 });

    const N = 100;
    const calls = Array.from({ length: N }, (_, i) =>
      authorize(testDb.db, {
        userId: USER,
        estimateCredits: 10,
        idempotencyKey: `concurrent_${i}`,
      })
        .then(() => ({ ok: true as const }))
        .catch((e: unknown) => ({ ok: false as const, e })),
    );
    const results = await Promise.all(calls);

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    expect(succeeded).toBe(5);
    expect(failed).toHaveLength(N - 5);
    for (const f of failed) {
      if (f.ok) continue;
      expect(f.e).toBeInstanceOf(InsufficientCredits);
    }

    const balance = await getBalance(testDb.db, USER);
    expect(balance.credits).toBe(0);

    const tokens = await testDb.db.select().from(authTokens);
    expect(tokens).toHaveLength(5);
    const totalHeld = tokens.reduce((sum, t) => sum + t.holdCredits, 0);
    expect(totalHeld).toBe(50); // sum of holds = original balance
  });

  // ---------------------------------------------------------------- 6
  test("idempotency: two authorize calls with same key return same token, single ledger entry", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 100 });

    const t1 = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 20,
      idempotencyKey: "idem_dup",
    });
    const t2 = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 20,
      idempotencyKey: "idem_dup",
    });

    expect(t1.id).toBe(t2.id);
    expect((await getBalance(testDb.db, USER)).credits).toBe(80); // debited once

    const authorizeEntries = (await getLedgerEntriesForUser(testDb.db, USER)).filter(
      (l) => l.reason === "AUTHORIZE",
    );
    expect(authorizeEntries).toHaveLength(1);
  });

  // ---------------------------------------------------------------- 7
  test("expireHolds rolls back ACTIVE holds past expiry; ignores committed/rolled-back", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 100 });

    // Active, not expired (still holds 10)
    const fresh = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 10,
      idempotencyKey: "fresh",
    });
    // Active and force-expire by writing past expires_at
    const stale = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 15,
      idempotencyKey: "stale",
    });
    await testDb.db
      .update(authTokens)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(authTokens.id, stale.id));
    // Already committed — must not be re-touched
    const done = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 5,
      idempotencyKey: "done",
    });
    await commit(testDb.db, { tokenId: done.id, actualCredits: 5, usedPlatformKey: false });

    expect((await getBalance(testDb.db, USER)).credits).toBe(70); // 100 − 10 − 15 − 5

    const result = await expireHolds(testDb.db);
    expect(result.expired).toBe(1);

    expect((await getBalance(testDb.db, USER)).credits).toBe(85); // refund of 15

    const stateOf = async (id: string) =>
      (await testDb.db.select().from(authTokens).where(eq(authTokens.id, id)))[0]?.state;
    expect(await stateOf(stale.id)).toBe("EXPIRED");
    expect(await stateOf(fresh.id)).toBe("ACTIVE");
    expect(await stateOf(done.id)).toBe("COMMITTED");
  });

  // ---------------------------------------------------------------- 8
  test("commit pushing lifetime past PLATFORM_KEY_CAP_CREDITS transitions state to EXHAUSTED", async () => {
    // Cap is enforced *at authorize time* against the estimate, so the only
    // way a COMMIT can cross the cap is when actualCredits > estimateCredits.
    // Setup: lifetime 1950, estimate 40 (1950+40=1990, under cap, authorize OK),
    // actual 80 → lifetime becomes 2030 (≥ 2000) → state must flip to EXHAUSTED.
    const cap = WALLET_CONSTANTS.PLATFORM_KEY_CAP_CREDITS;
    await insertWallet(testDb.db, {
      userId: USER,
      creditsRemaining: 5000,
      state: "SUBSCRIBED_PLATFORM_KEY",
      lifetimePlatformKeyCreditsConsumed: cap - 50,
    });

    const token = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 40,
      idempotencyKey: "near_cap",
    });
    await commit(testDb.db, { tokenId: token.id, actualCredits: 80, usedPlatformKey: true });

    const balance = await getBalance(testDb.db, USER);
    expect(balance.lifetimePlatformKeyCredits).toBe(cap + 30);
    expect(balance.state).toBe("EXHAUSTED");
  });

  // ---------------------------------------------------------------- bonus: authorize CAP_REACHED preflight
  test("authorize throws CapReached when estimate would push platform-key lifetime past the cap", async () => {
    const cap = WALLET_CONSTANTS.PLATFORM_KEY_CAP_CREDITS;
    await insertWallet(testDb.db, {
      userId: USER,
      creditsRemaining: 5000,
      state: "SUBSCRIBED_PLATFORM_KEY",
      lifetimePlatformKeyCreditsConsumed: cap - 50,
    });

    await expect(
      authorize(testDb.db, { userId: USER, estimateCredits: 100, idempotencyKey: "over" }),
    ).rejects.toBeInstanceOf(CapReached);

    expect((await getBalance(testDb.db, USER)).credits).toBe(5000); // unchanged
  });

  // ---------------------------------------------------------------- bonus: TokenNotActive guards
  test("commit on already-committed token throws TokenNotActive", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 100 });
    const token = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 10,
      idempotencyKey: "k_once",
    });
    await commit(testDb.db, { tokenId: token.id, actualCredits: 10, usedPlatformKey: false });
    await expect(
      commit(testDb.db, { tokenId: token.id, actualCredits: 10, usedPlatformKey: false }),
    ).rejects.toBeInstanceOf(TokenNotActive);
  });

  test("rollback on missing token throws AuthTokenNotFound", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 100 });
    await expect(
      rollback(testDb.db, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toBeInstanceOf(AuthTokenNotFound);
  });

  // ---------------------------------------------------------------- ledger sum invariant
  test("ledger total matches actualCredits debited (sum of all entries for token = -actual)", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 100 });
    const token = await authorize(testDb.db, {
      userId: USER,
      estimateCredits: 30,
      idempotencyKey: "ledger_sum",
    });
    await commit(testDb.db, { tokenId: token.id, actualCredits: 18, usedPlatformKey: false });

    const entries = await testDb.db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.ref, token.id));
    const sum = entries.reduce((s, e) => s + e.creditsDelta, 0);
    expect(sum).toBe(-18); // sum of AUTHORIZE(-30) + COMMIT(+12) = -18
  });

  // wallet ref retained for direct queries when needed
  test("starting balance round-trips via direct schema query (sanity)", async () => {
    await insertWallet(testDb.db, { userId: USER, creditsRemaining: 42 });
    const rows = await testDb.db.select().from(wallets).where(eq(wallets.userId, USER));
    expect(rows[0]?.creditsRemaining).toBe(42);
  });
});
