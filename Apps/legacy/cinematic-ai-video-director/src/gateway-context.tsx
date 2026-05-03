"use client";

import { type ReactNode, createContext, useContext } from "react";

/**
 * Minimal shape the legacy app needs from the gateway. Mirrors the part of
 * `@platform/gemini-gateway`'s GatewayClient surface this app actually uses.
 *
 * Note: the actual gateway returned by `clientForRequest()` extends this —
 * we narrow here so the legacy app doesn't need to import @platform/gemini-
 * gateway types directly.
 */
export type GatewayLike = {
  models: {
    generateContent: (req: {
      model: string;
      contents: string;
      config?: unknown;
    }) => Promise<{ text?: string }>;
  };
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

/**
 * Replaces the legacy app's `new GoogleGenAI({apiKey})` + .models.generateContent
 * pair. The actual implementation is wired by `apps/web` (issue 0017) which
 * fetches a request-scoped gateway via clientForRequest(...) and provides it
 * here. Tests mock this hook directly.
 */
export function useGateway(): GatewayLike {
  const ctx = useContext(GatewayContext);
  if (ctx === null) {
    throw new Error(
      "useGateway: no GatewayProvider in tree. apps/web must wrap this component with <GatewayProvider value={gateway}>.",
    );
  }
  return ctx;
}
