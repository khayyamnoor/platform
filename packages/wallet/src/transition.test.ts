import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { InvalidWalletTransition } from "./errors.js";
import { transition } from "./transition.js";
import type { WalletEvent, WalletState } from "./types.js";

const ALL_STATES: WalletState[] = [
  "TRIAL",
  "SUBSCRIBED_PLATFORM_KEY",
  "SUBSCRIBED_USER_KEY",
  "EXHAUSTED",
];

describe("SUBSCRIBE_PAID", () => {
  test("TRIAL → SUBSCRIBED_PLATFORM_KEY", () => {
    expect(transition("TRIAL", { type: "SUBSCRIBE_PAID" })).toBe("SUBSCRIBED_PLATFORM_KEY");
  });

  test.each(["SUBSCRIBED_PLATFORM_KEY", "SUBSCRIBED_USER_KEY", "EXHAUSTED"] as const)(
    "rejected from %s",
    (state) => {
      expect(() => transition(state, { type: "SUBSCRIBE_PAID" })).toThrow(InvalidWalletTransition);
    },
  );
});

describe("BYOK_KEY_ADDED", () => {
  test.each([
    ["SUBSCRIBED_PLATFORM_KEY", "SUBSCRIBED_USER_KEY"],
    ["EXHAUSTED", "SUBSCRIBED_USER_KEY"],
  ] as const)("%s → %s", (from, to) => {
    expect(transition(from, { type: "BYOK_KEY_ADDED" })).toBe(to);
  });

  test.each(["TRIAL", "SUBSCRIBED_USER_KEY"] as const)("rejected from %s", (state) => {
    expect(() => transition(state, { type: "BYOK_KEY_ADDED" })).toThrow(InvalidWalletTransition);
  });
});

describe("BYOK_KEY_REMOVED", () => {
  test("SUBSCRIBED_USER_KEY → SUBSCRIBED_PLATFORM_KEY (cap not yet hit)", () => {
    expect(
      transition("SUBSCRIBED_USER_KEY", { type: "BYOK_KEY_REMOVED", platformCapHit: false }),
    ).toBe("SUBSCRIBED_PLATFORM_KEY");
  });

  test("SUBSCRIBED_USER_KEY → EXHAUSTED (cap already hit)", () => {
    expect(
      transition("SUBSCRIBED_USER_KEY", { type: "BYOK_KEY_REMOVED", platformCapHit: true }),
    ).toBe("EXHAUSTED");
  });

  test.each(["TRIAL", "SUBSCRIBED_PLATFORM_KEY", "EXHAUSTED"] as const)(
    "rejected from %s",
    (state) => {
      expect(() => transition(state, { type: "BYOK_KEY_REMOVED", platformCapHit: false })).toThrow(
        InvalidWalletTransition,
      );
    },
  );
});

describe("PLATFORM_CAP_REACHED", () => {
  test("SUBSCRIBED_PLATFORM_KEY → EXHAUSTED", () => {
    expect(transition("SUBSCRIBED_PLATFORM_KEY", { type: "PLATFORM_CAP_REACHED" })).toBe(
      "EXHAUSTED",
    );
  });

  test.each(["TRIAL", "SUBSCRIBED_USER_KEY", "EXHAUSTED"] as const)("rejected from %s", (state) => {
    expect(() => transition(state, { type: "PLATFORM_CAP_REACHED" })).toThrow(
      InvalidWalletTransition,
    );
  });
});

describe("SUBSCRIPTION_CANCELED", () => {
  test.each(ALL_STATES)("%s with credits → TRIAL", (state) => {
    expect(transition(state, { type: "SUBSCRIPTION_CANCELED", creditsRemaining: 250 })).toBe(
      "TRIAL",
    );
  });

  test.each(ALL_STATES)("%s with no credits → EXHAUSTED", (state) => {
    expect(transition(state, { type: "SUBSCRIPTION_CANCELED", creditsRemaining: 0 })).toBe(
      "EXHAUSTED",
    );
  });
});

describe("property: any sequence of valid events stays in a defined state", () => {
  const arbState: fc.Arbitrary<WalletState> = fc.constantFrom(...ALL_STATES);
  const arbEvent: fc.Arbitrary<WalletEvent> = fc.oneof(
    fc.constant({ type: "SUBSCRIBE_PAID" } as const),
    fc.constant({ type: "BYOK_KEY_ADDED" } as const),
    fc.boolean().map((platformCapHit) => ({ type: "BYOK_KEY_REMOVED", platformCapHit }) as const),
    fc.constant({ type: "PLATFORM_CAP_REACHED" } as const),
    fc
      .integer({ min: 0, max: 12_000 })
      .map((creditsRemaining) => ({ type: "SUBSCRIPTION_CANCELED", creditsRemaining }) as const),
  );

  test("invariant: result (when transition does not throw) is always one of ALL_STATES", () => {
    fc.assert(
      fc.property(
        arbState,
        fc.array(arbEvent, { minLength: 0, maxLength: 25 }),
        (start, events) => {
          let s = start;
          for (const ev of events) {
            try {
              s = transition(s, ev);
            } catch (err) {
              if (!(err instanceof InvalidWalletTransition)) throw err;
            }
            if (!ALL_STATES.includes(s)) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });
});
