"use client";

import { type ReactNode, createContext, useContext } from "react";

export type GatewayState =
  | "TRIAL"
  | "SUBSCRIBED_PLATFORM_KEY"
  | "SUBSCRIBED_USER_KEY"
  | "EXHAUSTED";

export type GenerateReq = { model: string; contents: string; config?: unknown };

/**
 * The shape the legacy app needs from the gateway. apps/web wires the
 * concrete value (a fetch-backed proxy that POSTs to the gateway API
 * route + a pure tokenizer-based estimate). The wallet `state` is read
 * by the legacy app to surface "out of credits" / "BYOK required" UI.
 */
export type GatewayLike = {
  models: {
    generateContent: (req: GenerateReq) => Promise<{ text?: string }>;
  };
  /**
   * Pure pre-call estimator. Returns the credit cost the wallet would
   * authorise for `req`. Safe in client components; no network.
   */
  estimate: (req: GenerateReq) => { credits: number; rawUsd: number };
  /** Current wallet state so the app can disable Generate when EXHAUSTED. */
  state: GatewayState;
  /** Current credit balance — used to disable Generate when balance < estimate. */
  credits: number;
};

const GatewayContext = createContext<GatewayLike | null>(null);

export function GatewayProvider({
  value,
  children,
}: {
  value: GatewayLike;
  children: ReactNode;
}) {
  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGateway(): GatewayLike {
  const ctx = useContext(GatewayContext);
  if (ctx === null) {
    throw new Error(
      "useGateway: no GatewayProvider in tree. apps/web must wrap this component with <GatewayProvider value={gateway}>.",
    );
  }
  return ctx;
}
