import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { wallets } from "./wallets.js";

export const authTokenStateEnum = pgEnum("auth_token_state", [
  "ACTIVE",
  "COMMITTED",
  "ROLLED_BACK",
  "EXPIRED",
]);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => wallets.userId, { onDelete: "cascade" }),
    holdCredits: integer("hold_credits").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    state: authTokenStateEnum("state").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("auth_tokens_idempotency_key_idx").on(t.idempotencyKey),
    unique("auth_tokens_user_idempotency_unique").on(t.userId, t.idempotencyKey),
    check("hold_credits_non_negative", sql`${t.holdCredits} >= 0`),
  ],
);

export type AuthToken = typeof authTokens.$inferSelect;
export type NewAuthToken = typeof authTokens.$inferInsert;
export type AuthTokenState = (typeof authTokenStateEnum.enumValues)[number];
