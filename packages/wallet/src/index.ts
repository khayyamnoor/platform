export { WALLET_CONSTANTS } from "./constants.js";
export { InvalidWalletTransition, WalletNotFound } from "./errors.js";
export { getBalance } from "./getBalance.js";
export { transition } from "./transition.js";
export type {
  Balance,
  WalletEvent,
  WalletEventType,
  WalletPlan,
  WalletState,
} from "./types.js";

export const PACKAGE_NAME = "@platform/wallet" as const;
