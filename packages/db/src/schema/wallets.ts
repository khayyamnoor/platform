import { sql } from "drizzle-orm";
import {
  check,
  customType,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const walletPlanEnum = pgEnum("wallet_plan", ["FREE", "STARTER_30", "PRO_60", "MAX_90"]);

export const walletStateEnum = pgEnum("wallet_state", [
  "TRIAL",
  "SUBSCRIBED_PLATFORM_KEY",
  "SUBSCRIBED_USER_KEY",
  "EXHAUSTED",
]);

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().unique(),
    plan: walletPlanEnum("plan").notNull().default("FREE"),
    state: walletStateEnum("state").notNull().default("TRIAL"),
    creditsRemaining: integer("credits_remaining").notNull().default(0),
    lifetimePlatformKeyCreditsConsumed: integer("lifetime_platform_key_credits_consumed")
      .notNull()
      .default(0),
    byokKeyEncrypted: bytea("byok_key_encrypted"),
    byokDataKeyEncrypted: bytea("byok_data_key_encrypted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("credits_remaining_non_negative", sql`${t.creditsRemaining} >= 0`),
    check(
      "lifetime_platform_key_credits_consumed_non_negative",
      sql`${t.lifetimePlatformKeyCreditsConsumed} >= 0`,
    ),
  ],
);

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type WalletPlan = (typeof walletPlanEnum.enumValues)[number];
export type WalletState = (typeof walletStateEnum.enumValues)[number];
