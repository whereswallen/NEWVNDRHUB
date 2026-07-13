ALTER TABLE "organizations" ADD COLUMN "billing_status" text DEFAULT 'trialing' NOT NULL;
ALTER TABLE "organizations" ADD COLUMN "billing_period_ends_at" timestamp with time zone;
ALTER TABLE "organizations" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;
CREATE TABLE "stripe_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
