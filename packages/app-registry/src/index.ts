import { APPS } from "./manifest.js";
import type { AppManifest } from "./types.js";

export const PACKAGE_NAME = "@platform/app-registry" as const;

export function listApps(): readonly AppManifest[] {
  return APPS;
}

export function getApp(id: string): AppManifest | null {
  return APPS.find((a) => a.id === id) ?? null;
}

export type {
  ActionsPerPlanApprox,
  AppCategory,
  AppManifest,
  AppStatus,
} from "./types.js";
