export class WalletNotFound extends Error {
  readonly userId: string;
  constructor(userId: string) {
    super(`Wallet not found for userId=${userId}`);
    this.name = "WalletNotFound";
    this.userId = userId;
  }
}

export class InvalidWalletTransition extends Error {
  readonly fromState: string;
  readonly eventType: string;
  constructor(fromState: string, eventType: string) {
    super(`Invalid wallet transition: ${eventType} not allowed from state ${fromState}`);
    this.name = "InvalidWalletTransition";
    this.fromState = fromState;
    this.eventType = eventType;
  }
}

export class InsufficientCredits extends Error {
  readonly userId: string;
  readonly available: number;
  readonly requested: number;
  constructor(userId: string, available: number, requested: number) {
    super(
      `Insufficient credits for userId=${userId}: requested ${requested}, available ${available}`,
    );
    this.name = "InsufficientCredits";
    this.userId = userId;
    this.available = available;
    this.requested = requested;
  }
}

/**
 * Thrown when authorising a request would push platform-key consumption past
 * the BYOK takeover cap (PLATFORM_KEY_CAP_CREDITS = 2000), and the wallet is
 * still on the platform key. The user is expected to add their own Gemini key
 * to continue.
 */
export class CapReached extends Error {
  readonly userId: string;
  readonly lifetimeAfter: number;
  readonly cap: number;
  constructor(userId: string, lifetimeAfter: number, cap: number) {
    super(`Platform-key cap reached for userId=${userId}: ${lifetimeAfter} ≥ cap ${cap}`);
    this.name = "CapReached";
    this.userId = userId;
    this.lifetimeAfter = lifetimeAfter;
    this.cap = cap;
  }
}

export class TokenNotActive extends Error {
  readonly tokenId: string;
  readonly state: string;
  constructor(tokenId: string, state: string) {
    super(`Auth token ${tokenId} is not ACTIVE (current state: ${state})`);
    this.name = "TokenNotActive";
    this.tokenId = tokenId;
    this.state = state;
  }
}

export class AuthTokenNotFound extends Error {
  readonly tokenId: string;
  constructor(tokenId: string) {
    super(`Auth token not found: ${tokenId}`);
    this.name = "AuthTokenNotFound";
    this.tokenId = tokenId;
  }
}
