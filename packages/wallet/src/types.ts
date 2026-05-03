import type { WalletPlan, WalletState } from "@platform/db";

export type { WalletPlan, WalletState };

export type WalletEvent =
  | { type: "SUBSCRIBE_PAID" }
  | { type: "BYOK_KEY_ADDED" }
  | { type: "BYOK_KEY_REMOVED"; platformCapHit: boolean }
  | { type: "PLATFORM_CAP_REACHED" }
  | { type: "SUBSCRIPTION_CANCELED"; creditsRemaining: number };

export type WalletEventType = WalletEvent["type"];

export type Balance = {
  credits: number;
  plan: WalletPlan;
  state: WalletState;
  lifetimePlatformKeyCredits: number;
  byokKeyPresent: boolean;
};
