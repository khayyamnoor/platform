import { GoogleGenAI } from "@google/genai";
import { insertAppRun } from "@platform/db";
import { authorize, commit, getBalance, rollback } from "@platform/wallet";
import { getDecryptedByokKey } from "@platform/wallet/internal-byok";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { computeCreditsFromTokens, estimate } from "./estimate.js";
import { getPlatformKey } from "./platform-key.js";
import type { GenerateContentReq } from "./types.js";

type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export type GatewayContext = {
  userId: string;
  appId: string;
  /** Optional idempotency key. Defaults to `requestId` if absent. */
  idempotencyKey?: string;
  requestId: string;
  /** Per-call timeout in ms. Defaults to 30s (PRD decision F). */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;

export class DuplicateGatewayRequest extends Error {
  readonly tokenState: string;
  constructor(state: string) {
    super(
      `Gateway request already finalized (auth_tokens.state=${state}). Re-issue with a fresh idempotencyKey.`,
    );
    this.name = "DuplicateGatewayRequest";
    this.tokenState = state;
  }
}

export class GatewayTimeout extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Gateway timed out waiting for Gemini after ${timeoutMs}ms`);
    this.name = "GatewayTimeout";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Wallet is in EXHAUSTED state and the user has no BYOK key yet.
 * Caller surfaces the "add your Gemini API key to continue" modal.
 */
export class ByokRequired extends Error {
  readonly userId: string;
  constructor(userId: string) {
    super(`BYOK_REQUIRED: wallet for ${userId} is EXHAUSTED; add a Gemini key`);
    this.name = "ByokRequired";
    this.userId = userId;
  }
}

/**
 * Gemini rejected the user's BYOK key (401/403). Wallet hold is rolled back
 * (no work was done). The stored key is NOT auto-removed — caller is
 * expected to surface "your key seems invalid, replace or re-test".
 */
export class ByokInvalid extends Error {
  readonly userId: string;
  constructor(userId: string, sanitizedDetail: string) {
    super(`BYOK_INVALID: Gemini rejected the stored key for ${userId}: ${sanitizedDetail}`);
    this.name = "ByokInvalid";
    this.userId = userId;
  }
}

export type GatewayClient = Readonly<{
  models: Readonly<{
    generateContent: (req: GenerateContentReq) => Promise<unknown>;
  }>;
}>;

function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; code?: number; message?: string };
  if (e.status === 401 || e.status === 403) return true;
  if (e.code === 401 || e.code === 403) return true;
  if (typeof e.message === "string") {
    return /\b(401|403)\b/.test(e.message);
  }
  return false;
}

function sanitize(message: string, secret: string | null): string {
  if (!secret || secret.length === 0) return message;
  return message.split(secret).join("[REDACTED]");
}

/**
 * Build a one-shot Gemini client bound to a single user request. The returned
 * object is frozen — callers cannot patch its methods.
 *
 * For each `models.generateContent` call:
 *   1. Read wallet state. If EXHAUSTED, throw ByokRequired immediately.
 *   2. estimate(req) → estimateCredits
 *   3. wallet.authorize(...) → token (idempotent on requestId/idempotencyKey)
 *      Throws InsufficientCredits / CapReached before any Gemini call.
 *   4. If token already finalized (idempotent retry), throws DuplicateGatewayRequest
 *      without calling Gemini.
 *   5. Pick the API key:
 *        SUBSCRIBED_USER_KEY → decrypted BYOK key (request-scoped)
 *        TRIAL | SUBSCRIBED_PLATFORM_KEY → platform key
 *        EXHAUSTED already handled above.
 *   6. Race the SDK call against a `timeoutMs` timer.
 *   7a. Success: compute actualCredits from usageMetadata token counts;
 *       wallet.commit({usedPlatformKey: !useBYOK}); insert app_runs SUCCESS row.
 *       BYOK calls do NOT increment lifetime_platform_key_credits_consumed.
 *   7b. Error / timeout: wallet.rollback(...); insert app_runs FAILED row
 *       with sanitized error message (BYOK plaintext scrubbed); rethrow.
 *       If the error was 401/403 on a BYOK call, throw ByokInvalid instead
 *       of the raw error so the caller can surface the right modal.
 *
 * This is the ONLY file in the codebase allowed to import `@google/genai`
 * or `@platform/wallet/internal-byok` (Biome `noRestrictedImports` rule
 * blocks both elsewhere).
 */
export async function clientForRequest(
  db: AnyPgDatabase,
  ctx: GatewayContext,
): Promise<GatewayClient> {
  const idempotencyKey = ctx.idempotencyKey ?? ctx.requestId;
  const timeoutMs = ctx.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return Object.freeze({
    models: Object.freeze({
      async generateContent(req: GenerateContentReq) {
        const balance = await getBalance(db, ctx.userId);
        if (balance.state === "EXHAUSTED") {
          throw new ByokRequired(ctx.userId);
        }
        const useBYOK = balance.state === "SUBSCRIBED_USER_KEY";

        const { credits: estimateCredits } = estimate(req);
        const token = await authorize(db, {
          userId: ctx.userId,
          estimateCredits,
          idempotencyKey,
        });
        if (token.state !== "ACTIVE") {
          throw new DuplicateGatewayRequest(token.state);
        }

        // Plaintext key only lives inside this try-block. We null out the
        // local in finally so the closure can't retain a reference.
        let userKey: string | null = null;
        try {
          let apiKey: string;
          if (useBYOK) {
            userKey = await getDecryptedByokKey(db, ctx.userId);
            apiKey = userKey;
          } else {
            apiKey = getPlatformKey();
          }
          const ai = new GoogleGenAI({ apiKey });

          let timer: ReturnType<typeof setTimeout> | undefined;
          let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
          try {
            const callPromise = ai.models.generateContent({
              model: req.model,
              contents: req.contents,
            });
            const timeoutPromise = new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new GatewayTimeout(timeoutMs)), timeoutMs);
            });
            response = await Promise.race([callPromise, timeoutPromise]);
          } catch (err) {
            if (timer) clearTimeout(timer);
            await rollback(db, token.id);

            const rawMessage = err instanceof Error ? err.message : String(err);
            const cleanMessage = sanitize(rawMessage, userKey);

            await insertAppRun(db, {
              userId: ctx.userId,
              appId: ctx.appId,
              gatewayRequestId: ctx.requestId,
              status: "FAILED",
              creditsEstimate: estimateCredits,
              errorMessage: cleanMessage,
              completedAt: new Date(),
            });

            if (useBYOK && isAuthError(err)) {
              throw new ByokInvalid(ctx.userId, cleanMessage);
            }
            throw err;
          }
          if (timer) clearTimeout(timer);

          const usage = response.usageMetadata;
          const inputTokens = usage?.promptTokenCount ?? 0;
          const outputTokens = usage?.candidatesTokenCount ?? 0;
          const { credits: actualCredits } = computeCreditsFromTokens(
            req.model,
            inputTokens,
            outputTokens,
          );

          await commit(db, {
            tokenId: token.id,
            actualCredits,
            usedPlatformKey: !useBYOK,
          });
          await insertAppRun(db, {
            userId: ctx.userId,
            appId: ctx.appId,
            gatewayRequestId: ctx.requestId,
            status: "SUCCESS",
            creditsEstimate: estimateCredits,
            creditsActual: actualCredits,
            completedAt: new Date(),
          });

          return response;
        } finally {
          userKey = null;
        }
      },
    }),
  });
}
