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
