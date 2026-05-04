import { describe, expect, test, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
}));

const { POST } = await import("./route");

describe("POST /api/apps/cinematic-ai-video-director/run", () => {
  test("returns 401 UNAUTHENTICATED when Clerk auth() yields no userId", async () => {
    const req = new Request("http://localhost/api/apps/cinematic-ai-video-director/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: "hello" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("UNAUTHENTICATED");
  });
});
