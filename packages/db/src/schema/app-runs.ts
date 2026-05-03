import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { wallets } from "./wallets.js";

export const appRunStatusEnum = pgEnum("app_run_status", ["PENDING", "SUCCESS", "FAILED"]);

export const appRuns = pgTable(
  "app_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => wallets.userId, { onDelete: "cascade" }),
    appId: text("app_id").notNull(),
    gatewayRequestId: text("gateway_request_id"),
    status: appRunStatusEnum("status").notNull().default("PENDING"),
    creditsEstimate: integer("credits_estimate").notNull(),
    creditsActual: integer("credits_actual"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("app_runs_gateway_request_id_idx").on(t.gatewayRequestId)],
);

export type AppRun = typeof appRuns.$inferSelect;
export type NewAppRun = typeof appRuns.$inferInsert;
export type AppRunStatus = (typeof appRunStatusEnum.enumValues)[number];
