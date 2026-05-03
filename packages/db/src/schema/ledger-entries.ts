import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { wallets } from "./wallets.js";

export const ledgerReasonEnum = pgEnum("ledger_reason", [
  "AUTHORIZE",
  "COMMIT",
  "ROLLBACK",
  "GRANT",
  "EXPIRE",
  "ADJUST",
]);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => wallets.userId, { onDelete: "cascade" }),
    appId: text("app_id"),
    creditsDelta: integer("credits_delta").notNull(),
    reason: ledgerReasonEnum("reason").notNull(),
    ref: text("ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ledger_entries_user_id_idx").on(t.userId)],
);

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type LedgerReason = (typeof ledgerReasonEnum.enumValues)[number];
