import { GoogleGenAI } from "@google/genai";
import { insertAppRun } from "@platform/db";
import { authorize, commit, rollback } from "@platform/wallet";
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

export type GatewayClient = Readonly<{
  models: Readonly<{
    generateContent: (req: GenerateContentReq) => Promise<unknown>;
  }>;
}>;

/**
 * Build a one-shot Gemini client bound to a single user request. The returned
 * object is frozen — callers cannot patch its methods.
 *
 * For each `models.generateContent` call:
 *   1. estimate(req) → estimateCredits
 *   2. wallet.authorize(...) → token (idempotent on requestId/idempotencyKey)
 *      Throws InsufficientCredits / CapReached before any Gemini call.
 *   3. If token already finalized (idempotent retry), throws DuplicateGatewayRequest
 *      without calling Gemini.
 *   4. Race the SDK call against a `timeoutMs` timer.
 *   5a. Success: compute actualCredits from usageMetadata token counts;
 *       wallet.commit(...); insert app_runs SUCCESS row.
 *   5b. Error / timeout: wallet.rollback(...); insert app_runs FAILED row
 *       with verbatim error message; rethrow.
 *
 * This is the ONLY file in the codebase allowed to import `@google/genai`
 * (Biome `noRestrictedImports` rule blocks the import elsewhere).
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
        const { credits: estimateCredits } = estimate(req);

        const token = await authorize(db, {
          userId: ctx.userId,
          estimateCredits,
          idempotencyKey,
        });

        if (token.state !== "ACTIVE") {
          throw new DuplicateGatewayRequest(token.state);
        }

        const ai = new GoogleGenAI({ apiKey: getPlatformKey() });

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
          await insertAppRun(db, {
            userId: ctx.userId,
            appId: ctx.appId,
            gatewayRequestId: ctx.requestId,
            status: "FAILED",
            creditsEstimate: estimateCredits,
            errorMessage: err instanceof Error ? err.message : String(err),
            completedAt: new Date(),
          });
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
          usedPlatformKey: true,
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
      },
    }),
  });
}
