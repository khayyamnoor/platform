import { insertWallet, wallets } from "@platform/db";
import { type TestDb, createTestDb } from "@platform/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { addByokKey } from "./addByokKey.js";
import { WALLET_CONSTANTS } from "./constants.js";
import { InvalidWalletTransition, WalletNotFound } from "./errors.js";
import { ByokKeyNotPresent, getDecryptedByokKey } from "./internal-byok.js";
import { removeByokKey } from "./removeByokKey.js";

const REAL_KEY_A = `AIzaSy${"a".repeat(33)}`;
const REAL_KEY_B = `AIzaSy${"b".repeat(33)}`;

describe("addByokKey", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  test("populates byok_key_encrypted + byok_data_key_encrypted and transitions PLATFORM→USER", async () => {
    await insertWallet(testDb.db, {
      userId: "user_pro",
      state: "SUBSCRIBED_PLATFORM_KEY",
    });

    await addByokKey(testDb.db, { userId: "user_pro", plaintextKey: REAL_KEY_A });

    const rows = await testDb.db.select().from(wallets).where(eq(wallets.userId, "user_pro"));
    const w = rows[0];
    expect(w?.byokKeyEncrypted).not.toBeNull();
    expect(w?.byokDataKeyEncrypted).not.toBeNull();
    expect(w?.state).toBe("SUBSCRIBED_USER_KEY");
    expect(w?.byokKeyEncrypted?.toString("utf8")).not.toContain("AIzaSy");
  });

  test("EXHAUSTED → SUBSCRIBED_USER_KEY when adding a key", async () => {
    await insertWallet(testDb.db, { userId: "user_x", state: "EXHAUSTED" });
    await addByokKey(testDb.db, { userId: "user_x", plaintextKey: REAL_KEY_A });
    const w = (await testDb.db.select().from(wallets).where(eq(wallets.userId, "user_x")))[0];
    expect(w?.state).toBe("SUBSCRIBED_USER_KEY");
  });

  test("rejects from TRIAL (FSM does not allow BYOK_KEY_ADDED from TRIAL)", async () => {
    await insertWallet(testDb.db, { userId: "user_trial", state: "TRIAL" });
    await expect(
      addByokKey(testDb.db, { userId: "user_trial", plaintextKey: REAL_KEY_A }),
    ).rejects.toBeInstanceOf(InvalidWalletTransition);
  });

  test("two users with the same plaintext produce different ciphertexts (per-user data keys)", async () => {
    await insertWallet(testDb.db, {
      userId: "user_a",
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await insertWallet(testDb.db, {
      userId: "user_b",
      state: "SUBSCRIBED_PLATFORM_KEY",
    });

    await addByokKey(testDb.db, { userId: "user_a", plaintextKey: REAL_KEY_A });
    await addByokKey(testDb.db, { userId: "user_b", plaintextKey: REAL_KEY_A });

    const a = (await testDb.db.select().from(wallets).where(eq(wallets.userId, "user_a")))[0];
    const b = (await testDb.db.select().from(wallets).where(eq(wallets.userId, "user_b")))[0];
    // PGlite returns bytea as Uint8Array; convert to Buffer for the equals comparison.
    const aKey = Buffer.from(a?.byokKeyEncrypted ?? new Uint8Array());
    const bKey = Buffer.from(b?.byokKeyEncrypted ?? new Uint8Array());
    const aData = Buffer.from(a?.byokDataKeyEncrypted ?? new Uint8Array());
    const bData = Buffer.from(b?.byokDataKeyEncrypted ?? new Uint8Array());
    expect(aKey.equals(bKey)).toBe(false);
    expect(aData.equals(bData)).toBe(false);
  });

  test("WalletNotFound when the user has no wallet row", async () => {
    await expect(
      addByokKey(testDb.db, { userId: "user_ghost", plaintextKey: REAL_KEY_A }),
    ).rejects.toBeInstanceOf(WalletNotFound);
  });
});

describe("removeByokKey", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  test("clears both encryption columns and transitions USER→PLATFORM (cap not hit)", async () => {
    await insertWallet(testDb.db, {
      userId: "user_back_to_platform",
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await addByokKey(testDb.db, {
      userId: "user_back_to_platform",
      plaintextKey: REAL_KEY_A,
    });

    await removeByokKey(testDb.db, "user_back_to_platform");

    const w = (
      await testDb.db.select().from(wallets).where(eq(wallets.userId, "user_back_to_platform"))
    )[0];
    expect(w?.byokKeyEncrypted).toBeNull();
    expect(w?.byokDataKeyEncrypted).toBeNull();
    expect(w?.state).toBe("SUBSCRIBED_PLATFORM_KEY");
  });

  test("USER→EXHAUSTED when lifetime is already past the cap", async () => {
    await insertWallet(testDb.db, {
      userId: "user_capped",
      state: "SUBSCRIBED_USER_KEY",
      lifetimePlatformKeyCreditsConsumed: WALLET_CONSTANTS.PLATFORM_KEY_CAP_CREDITS + 100,
      byokKeyEncrypted: Buffer.from("ciphertext-placeholder"),
      byokDataKeyEncrypted: Buffer.from("data-key-placeholder"),
    });

    await removeByokKey(testDb.db, "user_capped");

    const w = (await testDb.db.select().from(wallets).where(eq(wallets.userId, "user_capped")))[0];
    expect(w?.state).toBe("EXHAUSTED");
    expect(w?.byokKeyEncrypted).toBeNull();
    expect(w?.byokDataKeyEncrypted).toBeNull();
  });
});

describe("getDecryptedByokKey (internal — gemini-gateway only)", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  test("returns the plaintext key that was stored", async () => {
    await insertWallet(testDb.db, {
      userId: "user_a",
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await addByokKey(testDb.db, { userId: "user_a", plaintextKey: REAL_KEY_A });

    const decrypted = await getDecryptedByokKey(testDb.db, "user_a");
    expect(decrypted).toBe(REAL_KEY_A);
  });

  test("two users get back their own keys", async () => {
    await insertWallet(testDb.db, {
      userId: "user_a",
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await insertWallet(testDb.db, {
      userId: "user_b",
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await addByokKey(testDb.db, { userId: "user_a", plaintextKey: REAL_KEY_A });
    await addByokKey(testDb.db, { userId: "user_b", plaintextKey: REAL_KEY_B });

    expect(await getDecryptedByokKey(testDb.db, "user_a")).toBe(REAL_KEY_A);
    expect(await getDecryptedByokKey(testDb.db, "user_b")).toBe(REAL_KEY_B);
  });

  test("ByokKeyNotPresent when user has no key stored", async () => {
    await insertWallet(testDb.db, { userId: "user_none" });
    await expect(getDecryptedByokKey(testDb.db, "user_none")).rejects.toBeInstanceOf(
      ByokKeyNotPresent,
    );
  });

  test("WalletNotFound when user has no wallet", async () => {
    await expect(getDecryptedByokKey(testDb.db, "user_ghost")).rejects.toBeInstanceOf(
      WalletNotFound,
    );
  });

  test("add → remove → decrypt throws ByokKeyNotPresent", async () => {
    await insertWallet(testDb.db, {
      userId: "user_a",
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await addByokKey(testDb.db, { userId: "user_a", plaintextKey: REAL_KEY_A });
    await removeByokKey(testDb.db, "user_a");

    await expect(getDecryptedByokKey(testDb.db, "user_a")).rejects.toBeInstanceOf(
      ByokKeyNotPresent,
    );
  });
});
