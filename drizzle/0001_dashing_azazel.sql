CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "role" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_token_hash_uq" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_admin_user_uq" ON "platform_admins" USING btree ("user_id");