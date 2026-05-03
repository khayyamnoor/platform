import { insertWallet } from "@platform/db";
import { type TestDb, createTestDb } from "@platform/db/testing";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { WalletNotFound } from "./errors.js";
import { getBalance } from "./getBalance.js";

describe("getBalance", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  test("throws WalletNotFound for an unknown user", async () => {
    await expect(getBalance(testDb.db, "user_ghost")).rejects.toBeInstanceOf(WalletNotFound);
  });

  test("returns FREE/TRIAL defaults for a freshly inserted wallet (no BYOK key)", async () => {
    await insertWallet(testDb.db, { userId: "user_a" });

    const balance = await getBalance(testDb.db, "user_a");
    expect(balance).toEqual({
      credits: 0,
      plan: "FREE",
      state: "TRIAL",
      lifetimePlatformKeyCredits: 0,
      byokKeyPresent: false,
    });
  });

  test("reflects subscribed state and credit balance from the row", async () => {
    await insertWallet(testDb.db, {
      userId: "user_pro",
      plan: "PRO_60",
      state: "SUBSCRIBED_PLATFORM_KEY",
      creditsRemaining: 6500,
      lifetimePlatformKeyCreditsConsumed: 500,
    });

    const balance = await getBalance(testDb.db, "user_pro");
    expect(balance.plan).toBe("PRO_60");
    expect(balance.state).toBe("SUBSCRIBED_PLATFORM_KEY");
    expect(balance.credits).toBe(6500);
    expect(balance.lifetimePlatformKeyCredits).toBe(500);
    expect(balance.byokKeyPresent).toBe(false);
  });

  test("byokKeyPresent is true when byok_key_encrypted is non-null", async () => {
    await insertWallet(testDb.db, {
      userId: "user_byok",
      state: "SUBSCRIBED_USER_KEY",
      byokKeyEncrypted: Buffer.from("ciphertext-placeholder"),
    });

    const balance = await getBalance(testDb.db, "user_byok");
    expect(balance.byokKeyPresent).toBe(true);
    expect(balance.state).toBe("SUBSCRIBED_USER_KEY");
  });
});
