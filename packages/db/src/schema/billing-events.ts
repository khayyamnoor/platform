import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const billingEvents = pgTable("billing_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  payloadJson: jsonb("payload_json").notNull(),
});

export type BillingEvent = typeof billingEvents.$inferSelect;
export type NewBillingEvent = typeof billingEvents.$inferInsert;
