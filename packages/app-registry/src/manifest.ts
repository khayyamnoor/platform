import type { AppManifest } from "./types.js";

/**
 * Single source of truth for which apps the platform exposes. v1 ships
 * exactly one entry — the wedge app — per slice-1 PRD.
 *
 * Frozen at module load. Adding an app: append a new entry below and
 * re-run `pnpm test` (the count assertion will need updating).
 */
export const APPS: readonly AppManifest[] = Object.freeze([
  Object.freeze({
    id: "cinematic-ai-video-director",
    name: "Cinematic Director",
    description: "Turn a video idea into a structured cinematographic shot list.",
    category: "Video planning",
    route: "/apps/cinematic-ai-video-director",
    status: "BETA",
    estimatedCreditsPerRun: 12,
    actionsPerPlanApprox: Object.freeze({
      STARTER_30: 250,
      PRO_60: 583,
      MAX_90: 1000,
    }),
  }),
]) as readonly AppManifest[];
