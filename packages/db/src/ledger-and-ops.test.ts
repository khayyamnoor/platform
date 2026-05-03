import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as dbApi from "./index.js";
import {
  getAppRun,
  getAuthToken,
  getBillingEvent,
  getLedgerEntriesForUser,
  insertAppRun,
  insertAuthToken,
  insertBillingEvent,
  insertLedgerEntry,
  insertWallet,
} from "./index.js";
import { type TestDb, createTestDb } from "./test/setup.js";

describe("ledger_entries", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
    await insertWallet(testDb.db, { userId: "user_a" });
  });

  afterEach(async () => {
    await testDb.close();
  });

  test("rejects an entry whose user_id has no matching wallet (FK miss)", async () => {
    await expect(
      insertLedgerEntry(testDb.db, {
        userId: "user_ghost",
        creditsDelta: -10,
        reason: "COMMIT",
      }),
    ).rejects.toThrow();
  });

  test("round-trips an inserted entry through getLedgerEntriesForUser", async () => {
    await insertLedgerEntry(testDb.db, {
      userId: "user_a",
      creditsDelta: 1000,
      reason: "GRANT",
      ref: "stripe_evt_initial_grant",
    });

    const rows = await getLedgerEntriesForUser(testDb.db, "user_a");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.creditsDelta).toBe(1000);
    expect(rows[0]?.reason).toBe("GRANT");
    expect(rows[0]?.ref).toBe("stripe_evt_initial_grant");
  });

  test("package exposes no update/delete helpers for ledger entries (append-only)", () => {
    const keys = Object.keys(dbApi);
    expect(keys).not.toContain("updateLedgerEntry");
    expect(keys).not.toContain("deleteLedgerEntry");
    expect(keys).toContain("insertLedgerEntry");
    expect(keys).toContain("getLedgerEntriesForUser");
  });
});

describe("auth_tokens", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
    await insertWallet(testDb.db, { userId: "user_a" });
  });

  afterEach(async () => {
    await testDb.close();
  });

  const baseToken = (overrides: Partial<{ idempotencyKey: string; holdCredits: number }> = {}) => ({
    userId: "user_a",
    holdCredits: 12,
    idempotencyKey: "idem_001",
    expiresAt: new Date(Date.now() + 30_000),
    ...overrides,
  });

  test("rejects a token whose user_id has no matching wallet (FK miss)", async () => {
    await expect(
      insertAuthToken(testDb.db, {
        userId: "user_ghost",
        holdCredits: 5,
        idempotencyKey: "idem_x",
        expiresAt: new Date(Date.now() + 30_000),
      }),
    ).rejects.toThrow();
  });

  test("rejects negative hold_credits (check constraint)", async () => {
    await expect(insertAuthToken(testDb.db, baseToken({ holdCredits: -1 }))).rejects.toThrow();
  });

  test("rejects a second token with the same (user_id, idempotency_key)", async () => {
    await insertAuthToken(testDb.db, baseToken());
    await expect(insertAuthToken(testDb.db, baseToken())).rejects.toThrow();
  });

  test("round-trips through getAuthToken", async () => {
    await insertAuthToken(testDb.db, baseToken());
    const token = await getAuthToken(testDb.db, "user_a", "idem_001");
    expect(token?.holdCredits).toBe(12);
    expect(token?.state).toBe("ACTIVE");
  });
});

describe("app_runs", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
    await insertWallet(testDb.db, { userId: "user_a" });
  });

  afterEach(async () => {
    await testDb.close();
  });

  test("rejects a run whose user_id has no matching wallet (FK miss)", async () => {
    await expect(
      insertAppRun(testDb.db, {
        userId: "user_ghost",
        appId: "cinematic-ai-video-director",
        creditsEstimate: 12,
      }),
    ).rejects.toThrow();
  });

  test("round-trips with PENDING default and nullable fields", async () => {
    await insertWallet(testDb.db, { userId: "user_a2" });
    await insertAppRun(testDb.db, {
      userId: "user_a",
      appId: "cinematic-ai-video-director",
      creditsEstimate: 12,
    });
    const all = await testDb.db.select().from(dbApi.appRuns);
    expect(all).toHaveLength(1);
    expect(all[0]?.status).toBe("PENDING");
    expect(all[0]?.creditsActual).toBeNull();
    expect(all[0]?.completedAt).toBeNull();

    const fetched = await getAppRun(testDb.db, all[0]?.id ?? "");
    expect(fetched?.appId).toBe("cinematic-ai-video-director");
  });
});

describe("billing_events", () => {
  let testDb: TestDb;

  beforeEach(async () => {
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  test("rejects a duplicate stripe_event_id (PK collision = idempotent webhook protection)", async () => {
    await insertBillingEvent(testDb.db, {
      stripeEventId: "evt_test_1",
      eventType: "invoice.paid",
      payloadJson: { foo: "bar" },
    });
    await expect(
      insertBillingEvent(testDb.db, {
        stripeEventId: "evt_test_1",
        eventType: "invoice.paid",
        payloadJson: { foo: "bar" },
      }),
    ).rejects.toThrow();
  });

  test("round-trips payload_json through getBillingEvent", async () => {
    const payload = { type: "checkout.session.completed", data: { id: "cs_x" } };
    await insertBillingEvent(testDb.db, {
      stripeEventId: "evt_test_2",
      eventType: "checkout.session.completed",
      payloadJson: payload,
    });
    const found = await getBillingEvent(testDb.db, "evt_test_2");
    expect(found?.payloadJson).toEqual(payload);
  });
});
