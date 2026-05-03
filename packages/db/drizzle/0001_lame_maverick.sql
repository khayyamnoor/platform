CREATE TYPE "public"."app_run_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."auth_token_state" AS ENUM('ACTIVE', 'COMMITTED', 'ROLLED_BACK', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."ledger_reason" AS ENUM('AUTHORIZE', 'COMMIT', 'ROLLBACK', 'GRANT', 'EXPIRE', 'ADJUST');--> statement-breakpoint
CREATE TABLE "app_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"app_id" text NOT NULL,
	"gateway_request_id" text,
	"status" "app_run_status" DEFAULT 'PENDING' NOT NULL,
	"credits_estimate" integer NOT NULL,
	"credits_actual" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"hold_credits" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"state" "auth_token_state" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_user_idempotency_unique" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "hold_credits_non_negative" CHECK ("auth_tokens"."hold_credits" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"app_id" text,
	"credits_delta" integer NOT NULL,
	"reason" "ledger_reason" NOT NULL,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_runs" ADD CONSTRAINT "app_runs_user_id_wallets_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."wallets"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_wallets_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."wallets"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_wallets_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."wallets"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_runs_gateway_request_id_idx" ON "app_runs" USING btree ("gateway_request_id");--> statement-breakpoint
CREATE INDEX "auth_tokens_idempotency_key_idx" ON "auth_tokens" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ledger_entries_user_id_idx" ON "ledger_entries" USING btree ("user_id");