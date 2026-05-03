import { describe, expect, test } from "vitest";
import { getApp, listApps } from "./index.js";

describe("app-registry", () => {
  test("listApps returns exactly one entry (the wedge app)", () => {
    const apps = listApps();
    expect(apps).toHaveLength(1);
    expect(apps[0]?.id).toBe("cinematic-ai-video-director");
  });

  test("getApp returns the cinematic director entry", () => {
    const app = getApp("cinematic-ai-video-director");
    expect(app).not.toBeNull();
    expect(app?.name).toBe("Cinematic Director");
    expect(app?.route).toBe("/apps/cinematic-ai-video-director");
    expect(app?.status).toBe("BETA");
    expect(app?.estimatedCreditsPerRun).toBe(12);
    expect(app?.actionsPerPlanApprox).toEqual({
      STARTER_30: 250,
      PRO_60: 583,
      MAX_90: 1000,
    });
  });

  test("getApp returns null for an unknown id", () => {
    expect(getApp("does-not-exist")).toBeNull();
  });

  test("manifest is frozen — runtime mutation throws", () => {
    const apps = listApps();
    expect(Object.isFrozen(apps)).toBe(true);
    expect(Object.isFrozen(apps[0])).toBe(true);
    expect(Object.isFrozen(apps[0]?.actionsPerPlanApprox)).toBe(true);
    // Strict-mode assignment to a frozen object throws TypeError.
    expect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: testing the runtime guard
      (apps as any).push({});
    }).toThrow();
    expect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: testing the runtime guard
      (apps[0] as any).id = "patched";
    }).toThrow();
  });
});
