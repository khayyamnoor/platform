import { appRuns, insertWallet, wallets } from "@platform/db";
import { type TestDb, createTestDb } from "@platform/db/testing";
import { WALLET_CONSTANTS, addByokKey, getBalance } from "@platform/wallet";
import { eq } from "drizzle-orm";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { ByokInvalid, ByokRequired, clientForRequest } from "./clientForRequest.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/*";
const USER_KEY = `AIzaSy${"u".repeat(33)}`; // 39 chars, real-shape Gemini key

let geminiHits = 0;
let lastApiKeyHeader: string | null = null;
let lastApiKeyQuery: string | null = null;

function defaultGeminiHandler(opts: {
  promptTokenCount: number;
  candidatesTokenCount: number;
}) {
  return http.post(GEMINI_URL, ({ request }) => {
    geminiHits += 1;
    const url = new URL(request.url);
    lastApiKeyQuery = url.searchParams.get("key");
    lastApiKeyHeader = request.headers.get("x-goog-api-key");
    return HttpResponse.json({
      candidates: [
        {
          content: { parts: [{ text: "ok" }], role: "model" },
          finishReason: "STOP",
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: opts.promptTokenCount,
        candidatesTokenCount: opts.candidatesTokenCount,
        totalTokenCount: opts.promptTokenCount + opts.candidatesTokenCount,
      },
    });
  });
}

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("clientForRequest — BYOK routing", () => {
  let testDb: TestDb;
  const userId = "user_a";
  const baseCtx = (overrides?: Partial<Parameters<typeof clientForRequest>[1]>) => ({
    userId,
    appId: "cinematic-ai-video-director",
    requestId: "req_test_1",
    ...overrides,
  });

  beforeEach(async () => {
    geminiHits = 0;
    lastApiKeyHeader = null;
    lastApiKeyQuery = null;
    server.resetHandlers();
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  // -------------------------------------------------------------- 1
  test("TRIAL → platform key used; lifetime_platform_key_credits_consumed increments", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 100, candidatesTokenCount: 100 }));
    await insertWallet(testDb.db, { userId, creditsRemaining: 1000, state: "TRIAL" });

    const client = await clientForRequest(testDb.db, baseCtx());
    await client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" });

    const balance = await getBalance(testDb.db, userId);
    expect(balance.lifetimePlatformKeyCredits).toBe(1);
    expect(balance.state).toBe("TRIAL");
    // Verify which key was actually sent on the wire
    const keyOnWire = lastApiKeyHeader ?? lastApiKeyQuery;
    expect(keyOnWire).not.toBe(USER_KEY);
  });

  // -------------------------------------------------------------- 2
  test("SUBSCRIBED_PLATFORM_KEY → platform key used; lifetime increments", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 100, candidatesTokenCount: 100 }));
    await insertWallet(testDb.db, {
      userId,
      creditsRemaining: 1000,
      state: "SUBSCRIBED_PLATFORM_KEY",
    });

    const client = await clientForRequest(testDb.db, baseCtx());
    await client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" });

    const balance = await getBalance(testDb.db, userId);
    expect(balance.lifetimePlatformKeyCredits).toBe(1);
    expect(balance.state).toBe("SUBSCRIBED_PLATFORM_KEY");
  });

  // -------------------------------------------------------------- 3
  test("SUBSCRIBED_USER_KEY → user key used (decrypted at call time); lifetime does NOT increment", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 100, candidatesTokenCount: 100 }));
    await insertWallet(testDb.db, {
      userId,
      creditsRemaining: 1000,
      state: "SUBSCRIBED_PLATFORM_KEY",
      lifetimePlatformKeyCreditsConsumed: 50,
    });
    await addByokKey(testDb.db, { userId, plaintextKey: USER_KEY });
    // After addByokKey, state is SUBSCRIBED_USER_KEY
    expect((await getBalance(testDb.db, userId)).state).toBe("SUBSCRIBED_USER_KEY");

    const client = await clientForRequest(testDb.db, baseCtx());
    await client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" });

    const balance = await getBalance(testDb.db, userId);
    // BYOK call: lifetime stays where it was, credits still drop by actual cost
    expect(balance.lifetimePlatformKeyCredits).toBe(50);
    expect(balance.credits).toBe(999);
    // Verify the user's plaintext key was actually sent on the wire
    const keyOnWire = lastApiKeyHeader ?? lastApiKeyQuery;
    expect(keyOnWire).toBe(USER_KEY);
  });

  // -------------------------------------------------------------- 4
  test("EXHAUSTED → throws ByokRequired, no Gemini call, no wallet mutation", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 1, candidatesTokenCount: 1 }));
    await insertWallet(testDb.db, {
      userId,
      creditsRemaining: 500,
      state: "EXHAUSTED",
      lifetimePlatformKeyCreditsConsumed: WALLET_CONSTANTS.PLATFORM_KEY_CAP_CREDITS + 100,
    });

    const client = await clientForRequest(testDb.db, baseCtx());
    await expect(
      client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" }),
    ).rejects.toBeInstanceOf(ByokRequired);

    expect(geminiHits).toBe(0);
    const balance = await getBalance(testDb.db, userId);
    expect(balance.credits).toBe(500); // untouched
  });

  // -------------------------------------------------------------- 5
  test("BYOK key rejected by Gemini (401) → ByokInvalid, wallet not debited, key NOT auto-removed", async () => {
    server.use(
      http.post(GEMINI_URL, () => {
        geminiHits += 1;
        return HttpResponse.json(
          { error: { code: 401, message: "API_KEY_INVALID", status: "UNAUTHENTICATED" } },
          { status: 401 },
        );
      }),
    );
    await insertWallet(testDb.db, {
      userId,
      creditsRemaining: 1000,
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await addByokKey(testDb.db, { userId, plaintextKey: USER_KEY });

    const client = await clientForRequest(testDb.db, baseCtx());
    await expect(
      client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" }),
    ).rejects.toBeInstanceOf(ByokInvalid);

    // Wallet hold is rolled back
    const balance = await getBalance(testDb.db, userId);
    expect(balance.credits).toBe(1000);

    // Stored BYOK key columns are NOT cleared (user must remove/replace manually)
    const w = (await testDb.db.select().from(wallets).where(eq(wallets.userId, userId)))[0];
    expect(w?.byokKeyEncrypted).not.toBeNull();
    expect(w?.byokDataKeyEncrypted).not.toBeNull();
    expect(w?.state).toBe("SUBSCRIBED_USER_KEY");
  });

  // -------------------------------------------------------------- 6
  test("plaintext key never appears in app_runs.error_message, even when echoed in Gemini response", async () => {
    server.use(
      http.post(GEMINI_URL, () => {
        geminiHits += 1;
        // Gemini misbehaving: echoes the API key in the error body
        return HttpResponse.json(
          {
            error: {
              code: 500,
              message: `Internal error processing key=${USER_KEY} for user request`,
              status: "INTERNAL",
            },
          },
          { status: 500 },
        );
      }),
    );
    await insertWallet(testDb.db, {
      userId,
      creditsRemaining: 1000,
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await addByokKey(testDb.db, { userId, plaintextKey: USER_KEY });

    const client = await clientForRequest(testDb.db, baseCtx());
    await expect(
      client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" }),
    ).rejects.toThrow();

    const runs = await testDb.db.select().from(appRuns);
    expect(runs).toHaveLength(1);
    const errMsg = runs[0]?.errorMessage ?? "";
    expect(errMsg).not.toContain(USER_KEY);
    // Sanitized form should retain the rest of the diagnostic
    expect(errMsg).toMatch(/REDACTED|500|Internal/i);
  });

  // -------------------------------------------------------------- 7
  test("plaintext key reference does not leak between consecutive BYOK calls (request-scoping)", async () => {
    // Best-effort: JS doesn't expose stack-frame inspection. We assert
    // request isolation instead — two users with distinct BYOK keys both
    // get their own keys delivered to Gemini, and one user's key never
    // appears for the other user's request.
    server.use(defaultGeminiHandler({ promptTokenCount: 50, candidatesTokenCount: 50 }));

    const userA = "user_a";
    const keyA = `AIzaSy${"a".repeat(33)}`;
    const userB = "user_b";
    const keyB = `AIzaSy${"b".repeat(33)}`;
    await insertWallet(testDb.db, {
      userId: userA,
      creditsRemaining: 1000,
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await insertWallet(testDb.db, {
      userId: userB,
      creditsRemaining: 1000,
      state: "SUBSCRIBED_PLATFORM_KEY",
    });
    await addByokKey(testDb.db, { userId: userA, plaintextKey: keyA });
    await addByokKey(testDb.db, { userId: userB, plaintextKey: keyB });

    // First call as user A
    const ca = await clientForRequest(testDb.db, {
      userId: userA,
      appId: "cinematic-ai-video-director",
      requestId: "req_a",
    });
    await ca.models.generateContent({ model: "gemini-2.5-pro", contents: "A" });
    expect(lastApiKeyHeader ?? lastApiKeyQuery).toBe(keyA);

    // Second call as user B — must observe userB's key, not stale A
    const cb = await clientForRequest(testDb.db, {
      userId: userB,
      appId: "cinematic-ai-video-director",
      requestId: "req_b",
    });
    await cb.models.generateContent({ model: "gemini-2.5-pro", contents: "B" });
    expect(lastApiKeyHeader ?? lastApiKeyQuery).toBe(keyB);
  });
});
