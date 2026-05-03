export { addByokKey, type AddByokKeyArgs } from "./addByokKey.js";
export { authorize, type AuthorizeArgs } from "./authorize.js";
export { commit, type CommitArgs } from "./commit.js";
export { WALLET_CONSTANTS } from "./constants.js";
export { RootKeyMisconfigured } from "./encryption/root-key.js";
export {
  AuthTokenNotFound,
  CapReached,
  InsufficientCredits,
  InvalidWalletTransition,
  TokenNotActive,
  WalletNotFound,
} from "./errors.js";
export { expireHolds } from "./expireHolds.js";
export { getBalance } from "./getBalance.js";
export { removeByokKey } from "./removeByokKey.js";
export { rollback } from "./rollback.js";
export { transition } from "./transition.js";
export type {
  Balance,
  WalletEvent,
  WalletEventType,
  WalletPlan,
  WalletState,
} from "./types.js";

export const PACKAGE_NAME = "@platform/wallet" as const;
