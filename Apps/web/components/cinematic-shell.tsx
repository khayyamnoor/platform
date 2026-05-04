"use client";

import LegacyApp from "@platform-legacy/cinematic-ai-video-director";
import {
  type GatewayLike,
  GatewayProvider,
  type GatewayState,
} from "@platform-legacy/cinematic-ai-video-director/gateway-context";
import { estimate as gatewayEstimate } from "@platform/gemini-gateway/client";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@platform/ui";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

const APP_ID = "cinematic-ai-video-director";

type ToastEntry =
  | { id: string; kind: "success"; title: string; description?: string }
  | { id: string; kind: "destructive"; title: string; description?: string };

export type CinematicShellProps = {
  state: GatewayState;
  credits: number;
};

/**
 * Wraps the legacy cinematic director with a request-scoped gateway whose
 * `models.generateContent` POSTs to the API route, fires a toast on
 * success/error, and triggers a router.refresh so the (shell) layout
 * re-fetches the wallet and the credit pill in the header updates.
 */
export function CinematicShell({ state, credits }: CinematicShellProps) {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const pushToast = useCallback((toast: Omit<ToastEntry, "id">) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { ...toast, id } as ToastEntry]);
    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts((t) => t.filter((tt) => tt.id !== id));
    }, 5_000);
  }, []);

  const gateway = useMemo<GatewayLike>(
    () => ({
      state,
      credits,
      estimate: (req) => gatewayEstimate({ model: "gemini-2.5-pro", contents: req.contents }),
      models: {
        async generateContent(req) {
          const res = await fetch(`/api/apps/${APP_ID}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: req.contents }),
          });
          const data = (await res.json()) as
            | {
                result: { text?: string };
                balance: { credits: number };
              }
            | { error: string; message?: string };

          if (!res.ok || "error" in data) {
            const errData = data as { error?: string; message?: string };
            const detail = errData.message ?? "Unknown error";
            const errCode = errData.error ?? "ERROR";
            pushToast({ kind: "destructive", title: errCode, description: detail });
            router.refresh();
            throw new Error(`${errCode}: ${detail}`);
          }

          const { result, balance } = data;
          // Computed delta from the server's authoritative new balance.
          const used = credits - balance.credits;
          pushToast({
            kind: "success",
            title: `Used ${used} credits`,
            description: `${balance.credits.toLocaleString()} remaining.`,
          });
          router.refresh(); // server components re-render with new wallet
          return result;
        },
      },
    }),
    [state, credits, pushToast, router],
  );

  return (
    <ToastProvider>
      <GatewayProvider value={gateway}>
        <LegacyApp />
      </GatewayProvider>

      {toasts.map((t) => (
        <Toast key={t.id} variant={t.kind === "success" ? "success" : "destructive"} open>
          <ToastTitle>{t.title}</ToastTitle>
          {t.description && <ToastDescription>{t.description}</ToastDescription>}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
