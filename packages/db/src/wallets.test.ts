import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getWallet, insertWallet } from "./index.js";
import { type TestDb, createTestDb } from "./test/setup.js";

describe("wallets", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  test("getWallet returns null for a missing user", async () => {
    const result = await getWallet(testDb.db, "user_does_not_exist");
    expect(result).toBeNull();
  });

  test("insertWallet round-trips through getWallet with FREE/TRIAL defaults", async () => {
    await insertWallet(testDb.db, { userId: "user_abc" });
    const wallet = await getWallet(testDb.db, "user_abc");

    expect(wallet).not.toBeNull();
    if (wallet === null) return;
    expect(wallet.userId).toBe("user_abc");
    expect(wallet.plan).toBe("FREE");
    expect(wallet.state).toBe("TRIAL");
    expect(wallet.creditsRemaining).toBe(0);
    expect(wallet.lifetimePlatformKeyCreditsConsumed).toBe(0);
    expect(wallet.byokKeyEncrypted).toBeNull();
    expect(wallet.byokDataKeyEncrypted).toBeNull();
    expect(wallet.id).toMatch(/^[0-9a-f]{8}-/);
    expect(wallet.createdAt).toBeInstanceOf(Date);
    expect(wallet.updatedAt).toBeInstanceOf(Date);
  });

  test("insertWallet honours non-default field overrides", async () => {
    await insertWallet(testDb.db, {
      userId: "user_pro",
      plan: "PRO_60",
      state: "SUBSCRIBED_PLATFORM_KEY",
      creditsRemaining: 7000,
    });

    const wallet = await getWallet(testDb.db, "user_pro");
    expect(wallet?.plan).toBe("PRO_60");
    expect(wallet?.state).toBe("SUBSCRIBED_PLATFORM_KEY");
    expect(wallet?.creditsRemaining).toBe(7000);
  });

  test("unique(user_id) constraint rejects a second wallet for the same user", async () => {
    await insertWallet(testDb.db, { userId: "user_dup" });
    await expect(insertWallet(testDb.db, { userId: "user_dup" })).rejects.toThrow();
  });
});
