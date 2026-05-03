/**
 * Internal v1 enums. Add categories/statuses as new wedges land — each
 * addition is one literal here plus an entry in `APPS`.
 */
export type AppCategory = "Video planning";
export type AppStatus = "BETA" | "STABLE";

/** Map of plan tier → marketing-page approximation of action count. */
export type ActionsPerPlanApprox = {
  STARTER_30: number;
  PRO_60: number;
  MAX_90: number;
};

export type AppManifest = {
  /** Stable, kebab-case id. Used in URLs and ledger refs. */
  id: string;
  /** Human-readable name shown on dashboard cards and route headers. */
  name: string;
  /** One-line description shown on dashboard cards. */
  description: string;
  category: AppCategory;
  /** Next.js App Router path. */
  route: `/apps/${string}`;
  status: AppStatus;
  /** Approximate credits per typical run — for dashboard card preview. */
  estimatedCreditsPerRun: number;
  /** "About 250 generations on STARTER_30" approximation, marketing copy only. */
  actionsPerPlanApprox: ActionsPerPlanApprox;
};
