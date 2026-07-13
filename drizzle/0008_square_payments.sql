CREATE TABLE "square_webhook_events" ("id" text PRIMARY KEY NOT NULL,"type" text NOT NULL,"processed_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE "square_payments" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,"sale_id" uuid NOT NULL REFERENCES "sales"("id"),"store_id" uuid NOT NULL REFERENCES "stores"("id"),"square_payment_id" text NOT NULL,"square_order_id" text,"status" text NOT NULL,"amount_cents" integer NOT NULL,"currency" text DEFAULT 'CAD' NOT NULL,"idempotency_key" text NOT NULL,"last_synchronized_at" timestamp with time zone DEFAULT now() NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE UNIQUE INDEX "square_payment_external_uq" ON "square_payments" ("square_payment_id");
CREATE UNIQUE INDEX "square_payment_sale_uq" ON "square_payments" ("sale_id");
CREATE UNIQUE INDEX "square_payment_idempotency_uq" ON "square_payments" ("idempotency_key");
