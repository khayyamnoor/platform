import { InvalidWalletTransition } from "./errors.js";
import type { WalletEvent, WalletState } from "./types.js";

/**
 * Pure state machine for wallet lifecycle. No I/O.
 * Throws `InvalidWalletTransition` when an event cannot fire from the current state.
 */
export function transition(state: WalletState, event: WalletEvent): WalletState {
  switch (event.type) {
    case "SUBSCRIBE_PAID":
      if (state === "TRIAL") return "SUBSCRIBED_PLATFORM_KEY";
      throw new InvalidWalletTransition(state, event.type);

    case "BYOK_KEY_ADDED":
      if (state === "SUBSCRIBED_PLATFORM_KEY" || state === "EXHAUSTED") {
        return "SUBSCRIBED_USER_KEY";
      }
      throw new InvalidWalletTransition(state, event.type);

    case "BYOK_KEY_REMOVED":
      if (state === "SUBSCRIBED_USER_KEY") {
        return event.platformCapHit ? "EXHAUSTED" : "SUBSCRIBED_PLATFORM_KEY";
      }
      throw new InvalidWalletTransition(state, event.type);

    case "PLATFORM_CAP_REACHED":
      if (state === "SUBSCRIBED_PLATFORM_KEY") return "EXHAUSTED";
      throw new InvalidWalletTransition(state, event.type);

    case "SUBSCRIPTION_CANCELED":
      return event.creditsRemaining > 0 ? "TRIAL" : "EXHAUSTED";
  }
}
