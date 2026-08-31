CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."peer_type" AS ENUM('named', 'body');--> statement-breakpoint
CREATE TYPE "public"."record_type" AS ENUM('actual', 'budget');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('processing', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'viewer');--> statement-breakpoint
CREATE TABLE "ai_chat_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"filter_context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmark_peers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_scope" varchar(50) NOT NULL,
	"peer_name" varchar(255) NOT NULL,
	"peer_type" "peer_type" NOT NULL,
	"roi_multiple" numeric(6, 2) NOT NULL,
	"source_label" varchar(255) NOT NULL,
	"source_url" varchar(500),
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pnl_data_id" uuid NOT NULL,
	"component_key" varchar(50) NOT NULL,
	"component_label" varchar(100) NOT NULL,
	"amount" numeric(12, 4) DEFAULT '0' NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" varchar(30) DEFAULT 'dark' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"default_division" varchar(50) DEFAULT 'Combine' NOT NULL,
	"default_year" varchar(10) DEFAULT 'All' NOT NULL,
	"default_quarter" varchar(10) DEFAULT 'All' NOT NULL,
	"chart_metric" varchar(20) DEFAULT 'sum' NOT NULL,
	"pnlrep_mode" varchar(10) DEFAULT 'both' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "data_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" uuid,
	"filename" varchar(500) NOT NULL,
	"storage_path" varchar(1000),
	"rows_processed" integer DEFAULT 0 NOT NULL,
	"divisions_updated" text[] DEFAULT '{}'::text[] NOT NULL,
	"periods_updated" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "upload_status" DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"rate_idr_per_usd" numeric(10, 2) NOT NULL,
	"rate_date" timestamp NOT NULL,
	"source" varchar(100) DEFAULT 'BI JISDOR' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fx_rates_period_id_unique" UNIQUE("period_id")
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(20) NOT NULL,
	"year" smallint NOT NULL,
	"quarter" smallint,
	"is_fy" boolean DEFAULT false NOT NULL,
	"is_ytd" boolean DEFAULT false NOT NULL,
	"ytd_through_q" smallint,
	"sort_order" integer NOT NULL,
	CONSTRAINT "periods_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "pnl_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"record_type" "record_type" NOT NULL,
	"cost_saving" numeric(12, 4) DEFAULT '0' NOT NULL,
	"cost_avoidance" numeric(12, 4) DEFAULT '0' NOT NULL,
	"total_value_creation" numeric(12, 4) DEFAULT '0' NOT NULL,
	"initial_sum" numeric(12, 4) DEFAULT '0' NOT NULL,
	"sum_after_saving" numeric(12, 4) DEFAULT '0' NOT NULL,
	"total_cost_incurred" numeric(12, 4) DEFAULT '0' NOT NULL,
	"net_value_creation" numeric(12, 4) GENERATED ALWAYS AS ((total_value_creation - total_cost_incurred)) STORED NOT NULL,
	"roi_pct" numeric(8, 4) GENERATED ALWAYS AS ((CASE WHEN total_cost_incurred > 0 THEN (total_value_creation - total_cost_incurred) / total_cost_incurred * 100 ELSE 0 END)) STORED NOT NULL,
	"value_to_sum_pct" numeric(8, 4) GENERATED ALWAYS AS ((CASE WHEN initial_sum > 0 THEN total_value_creation / initial_sum * 100 ELSE 0 END)) STORED NOT NULL,
	"revenue" numeric(14, 4) DEFAULT '0' NOT NULL,
	"gross_profit" numeric(14, 4) DEFAULT '0' NOT NULL,
	"uploaded_by" uuid,
	"source_file" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"payload" jsonb,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"division_access" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_chat_history" ADD CONSTRAINT "ai_chat_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_components" ADD CONSTRAINT "cost_components_pnl_data_id_pnl_data_id_fk" FOREIGN KEY ("pnl_data_id") REFERENCES "public"."pnl_data"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_preferences" ADD CONSTRAINT "dashboard_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_uploads" ADD CONSTRAINT "data_uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pnl_data" ADD CONSTRAINT "pnl_data_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pnl_data" ADD CONSTRAINT "pnl_data_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pnl_data" ADD CONSTRAINT "pnl_data_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_session" ON "ai_chat_history" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "idx_cc_pnl" ON "cost_components" USING btree ("pnl_data_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pnl_div_period_type_uniq" ON "pnl_data" USING btree ("division_id","period_id","record_type");--> statement-breakpoint
CREATE INDEX "idx_pnl_division" ON "pnl_data" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "idx_pnl_period" ON "pnl_data" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "user_sessions" USING btree ("user_id");