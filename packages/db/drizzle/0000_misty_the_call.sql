CREATE TYPE "public"."wallet_plan" AS ENUM('FREE', 'STARTER_30', 'PRO_60', 'MAX_90');--> statement-breakpoint
CREATE TYPE "public"."wallet_state" AS ENUM('TRIAL', 'SUBSCRIBED_PLATFORM_KEY', 'SUBSCRIBED_USER_KEY', 'EXHAUSTED');--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan" "wallet_plan" DEFAULT 'FREE' NOT NULL,
	"state" "wallet_state" DEFAULT 'TRIAL' NOT NULL,
	"credits_remaining" integer DEFAULT 0 NOT NULL,
	"lifetime_platform_key_credits_consumed" integer DEFAULT 0 NOT NULL,
	"byok_key_encrypted" "bytea",
	"byok_data_key_encrypted" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "credits_remaining_non_negative" CHECK ("wallets"."credits_remaining" >= 0),
	CONSTRAINT "lifetime_platform_key_credits_consumed_non_negative" CHECK ("wallets"."lifetime_platform_key_credits_consumed" >= 0)
);
