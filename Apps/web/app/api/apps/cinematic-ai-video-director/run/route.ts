import { auth } from "@clerk/nextjs/server";
import { clientForRequest } from "@platform/gemini-gateway";
import { getBalance } from "@platform/wallet";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/db";
import { ensureWallet } from "../../../../../lib/ensure-wallet";

const APP_ID = "cinematic-ai-video-director";

/**
 * POST /api/apps/cinematic-ai-video-director/run
 *
 * Request body:
 *   { contents: string, idempotencyKey?: string }
 *
 * Response:
 *   200 → { result: GeminiGenerateContentResponse, balance: { credits, plan, state } }
 *   401 → { error: "UNAUTHENTICATED" }
 *   402 → { error: "INSUFFICIENT_CREDITS" | "CAP_REACHED" | "BYOK_REQUIRED" }
 *   400 → { error: "BAD_REQUEST", message }
 *   502 → { error: "GEMINI_ERROR" | "BYOK_INVALID", message }
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: { contents?: unknown; idempotencyKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "invalid JSON" }, { status: 400 });
  }

  const contents = typeof body.contents === "string" ? body.contents : null;
  if (!contents) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "contents is required (string)" },
      { status: 400 },
    );
  }
  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey : randomUUID();
  const requestId = randomUUID();

  const db = getDb();
  await ensureWallet(userId); // make sure first-call from this app provisions

  try {
    const client = await clientForRequest(db, {
      userId,
      appId: APP_ID,
      requestId,
      idempotencyKey,
    });
    const result = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents,
    });

    const balance = await getBalance(db, userId);
    return NextResponse.json({ result, balance });
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    const message = err instanceof Error ? err.message : String(err);

    if (name === "InsufficientCredits") {
      return NextResponse.json({ error: "INSUFFICIENT_CREDITS", message }, { status: 402 });
    }
    if (name === "CapReached") {
      return NextResponse.json({ error: "CAP_REACHED", message }, { status: 402 });
    }
    if (name === "ByokRequired") {
      return NextResponse.json({ error: "BYOK_REQUIRED", message }, { status: 402 });
    }
    if (name === "ByokInvalid") {
      return NextResponse.json({ error: "BYOK_INVALID", message }, { status: 502 });
    }
    if (name === "DuplicateGatewayRequest") {
      return NextResponse.json({ error: "DUPLICATE", message }, { status: 409 });
    }
    return NextResponse.json({ error: "GEMINI_ERROR", message }, { status: 502 });
  }
}
