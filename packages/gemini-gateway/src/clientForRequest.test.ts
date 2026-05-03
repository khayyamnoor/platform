import { appRuns, getLedgerEntriesForUser, insertWallet, wallets } from "@platform/db";
import { type TestDb, createTestDb } from "@platform/db/testing";
import { CapReached, InsufficientCredits, getBalance } from "@platform/wallet";
import { eq } from "drizzle-orm";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { DuplicateGatewayRequest, GatewayTimeout, clientForRequest } from "./clientForRequest.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/*";

let geminiHits = 0;

function defaultGeminiHandler(opts: {
  promptTokenCount: number;
  candidatesTokenCount: number;
  text?: string;
}) {
  return http.post(GEMINI_URL, () => {
    geminiHits += 1;
    return HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [{ text: opts.text ?? "mock response" }],
            role: "model",
          },
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

describe("clientForRequest", () => {
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
    server.resetHandlers();
    testDb = await createTestDb();
  });

  afterEach(async () => {
    await testDb.close();
  });

  // -------------------------------------------------------------- 1
  test("success: wallet debited by actualCredits, app_runs SUCCESS, response shape preserved", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 100, candidatesTokenCount: 100 }));
    await insertWallet(testDb.db, { userId, creditsRemaining: 1000 });

    const client = await clientForRequest(testDb.db, baseCtx());
    const response = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents: "Hello world",
    });

    // Response shape mirrors @google/genai
    const r = response as {
      candidates: { content: { parts: { text: string }[] } }[];
      usageMetadata: { totalTokenCount: number };
    };
    expect(r.candidates[0]?.content.parts[0]?.text).toBe("mock response");
    expect(r.usageMetadata.totalTokenCount).toBe(200);

    // Actual cost: 100 input + 100 output @ 2.5-pro rates × 2 markup ÷ 0.005
    // = (100*0.00125 + 100*0.005)/1000 * 2 / 0.005 = 0.000625/1000? recompute…
    // raw = (100*0.00125 + 100*0.005)/1000 = (0.125 + 0.5)/1000 = 0.000625 USD
    // retail = 0.00125 USD → 0.00125 / 0.005 = 0.25 → ceil → 1 credit
    const balance = await getBalance(testDb.db, userId);
    expect(balance.credits).toBe(999);
    expect(balance.lifetimePlatformKeyCredits).toBe(1);

    const runs = await testDb.db.select().from(appRuns);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("SUCCESS");
    expect(runs[0]?.creditsActual).toBe(1);
    expect(runs[0]?.errorMessage).toBeNull();
  });

  // -------------------------------------------------------------- 2
  test("Gemini 429: rollback, app_runs FAILED with verbatim error", async () => {
    server.use(
      http.post(GEMINI_URL, () => {
        geminiHits += 1;
        return HttpResponse.json(
          { error: { code: 429, message: "Rate limit exceeded" } },
          { status: 429 },
        );
      }),
    );
    await insertWallet(testDb.db, { userId, creditsRemaining: 1000 });

    const client = await clientForRequest(testDb.db, baseCtx());
    await expect(
      client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" }),
    ).rejects.toThrow();

    const balance = await getBalance(testDb.db, userId);
    expect(balance.credits).toBe(1000); // fully refunded

    const runs = await testDb.db.select().from(appRuns);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("FAILED");
    expect(runs[0]?.errorMessage).toMatch(/429|rate limit/i);
  });

  // -------------------------------------------------------------- 3
  test("usageMetadata > estimate: commit reconciles by debiting the difference", async () => {
    // Estimate for "Hi" is small (~1 credit). Have Gemini report large usage
    // so actualCredits > estimateCredits.
    server.use(defaultGeminiHandler({ promptTokenCount: 5000, candidatesTokenCount: 5000 }));
    await insertWallet(testDb.db, { userId, creditsRemaining: 1000 });

    const client = await clientForRequest(testDb.db, baseCtx());
    await client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" });

    // raw = (5000*0.00125 + 5000*0.005)/1000 = (6.25 + 25)/1000 = 0.03125
    // retail = 0.0625 → 0.0625/0.005 = 12.5 → ceil = 13 credits
    const balance = await getBalance(testDb.db, userId);
    expect(balance.credits).toBe(1000 - 13);

    const ledger = await getLedgerEntriesForUser(testDb.db, userId);
    const authorizeEntry = ledger.find((l) => l.reason === "AUTHORIZE");
    const commitEntry = ledger.find((l) => l.reason === "COMMIT");
    // estimate for "Hi" rounds to 1; commit delta = -(actual - estimate) = -12
    expect(authorizeEntry?.creditsDelta).toBe(-1);
    expect(commitEntry?.creditsDelta).toBe(-12);
  });

  // -------------------------------------------------------------- 4
  test("Gemini hangs past timeout: GatewayTimeout, rollback, app_runs FAILED", async () => {
    server.use(
      http.post(GEMINI_URL, async () => {
        geminiHits += 1;
        await delay(5_000); // far longer than the test's timeoutMs
        return HttpResponse.json({});
      }),
    );
    await insertWallet(testDb.db, { userId, creditsRemaining: 1000 });

    const client = await clientForRequest(testDb.db, baseCtx({ timeoutMs: 50 }));
    await expect(
      client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" }),
    ).rejects.toBeInstanceOf(GatewayTimeout);

    const balance = await getBalance(testDb.db, userId);
    expect(balance.credits).toBe(1000); // refunded

    const runs = await testDb.db.select().from(appRuns);
    expect(runs[0]?.status).toBe("FAILED");
    expect(runs[0]?.errorMessage).toMatch(/timed out/i);
  });

  // -------------------------------------------------------------- 5
  test("INSUFFICIENT_CREDITS before Gemini call: throws, no Gemini hit", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 1, candidatesTokenCount: 1 }));
    await insertWallet(testDb.db, { userId, creditsRemaining: 0 });

    const client = await clientForRequest(testDb.db, baseCtx());
    await expect(
      client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" }),
    ).rejects.toBeInstanceOf(InsufficientCredits);

    expect(geminiHits).toBe(0);
    const runs = await testDb.db.select().from(appRuns);
    expect(runs).toHaveLength(0);
  });

  // -------------------------------------------------------------- 6
  test("CAP_REACHED before Gemini call: throws, no Gemini hit", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 1, candidatesTokenCount: 1 }));
    // Lifetime within 1 credit of cap; estimate alone (≥1) crosses.
    await insertWallet(testDb.db, {
      userId,
      creditsRemaining: 1000,
      state: "SUBSCRIBED_PLATFORM_KEY",
      lifetimePlatformKeyCreditsConsumed: 2000,
    });

    const client = await clientForRequest(testDb.db, baseCtx());
    await expect(
      client.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" }),
    ).rejects.toBeInstanceOf(CapReached);

    expect(geminiHits).toBe(0);
    const runs = await testDb.db.select().from(appRuns);
    expect(runs).toHaveLength(0);
  });

  // -------------------------------------------------------------- 7
  test("idempotent retry with same idempotencyKey: only one Gemini call", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 100, candidatesTokenCount: 100 }));
    await insertWallet(testDb.db, { userId, creditsRemaining: 1000 });

    const ctx = baseCtx({ idempotencyKey: "idem_dup" });

    // First call goes through normally
    const c1 = await clientForRequest(testDb.db, ctx);
    await c1.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" });

    // Second call with the same idempotency key sees a finalized token →
    // throws DuplicateGatewayRequest before contacting Gemini.
    const c2 = await clientForRequest(testDb.db, ctx);
    await expect(
      c2.models.generateContent({ model: "gemini-2.5-pro", contents: "Hi" }),
    ).rejects.toBeInstanceOf(DuplicateGatewayRequest);

    expect(geminiHits).toBe(1);

    // Wallet was debited exactly once
    const balance = await getBalance(testDb.db, userId);
    expect(balance.credits).toBe(999);
  });

  // -------------------------------------------------------------- bonus: frozen client
  test("returned client is frozen — caller cannot patch generateContent", async () => {
    await insertWallet(testDb.db, { userId, creditsRemaining: 1000 });
    const client = await clientForRequest(testDb.db, baseCtx());

    expect(Object.isFrozen(client)).toBe(true);
    expect(Object.isFrozen(client.models)).toBe(true);
    expect(() => {
      // Deliberately attempt to monkey-patch
      (client.models as { generateContent?: unknown }).generateContent = () => "patched";
    }).toThrow();
  });

  // -------------------------------------------------------------- bonus: wallet row updated
  test("wallet.state and lifetime metrics persist after a successful call", async () => {
    server.use(defaultGeminiHandler({ promptTokenCount: 100, candidatesTokenCount: 100 }));
    await insertWallet(testDb.db, {
      userId,
      creditsRemaining: 100,
      state: "SUBSCRIBED_PLATFORM_KEY",
    });

    const client = await clientForRequest(testDb.db, baseCtx());
    await client.models.generateContent({ model: "gemini-2.5-pro", contents: "ok" });

    const w = (await testDb.db.select().from(wallets).where(eq(wallets.userId, userId)))[0];
    expect(w?.state).toBe("SUBSCRIBED_PLATFORM_KEY");
    expect(w?.lifetimePlatformKeyCreditsConsumed).toBe(1);
  });
});
