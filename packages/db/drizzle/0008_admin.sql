CREATE TABLE "admin_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_user_id" text,
	"action" text NOT NULL,
	"target_user_id" text,
	"email_hash" text,
	"reason" text,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "admin_verification" (
	"session_id" text PRIMARY KEY NOT NULL,
	"verified_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_change" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"new_email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "email_change_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "email_change_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_verification" ADD CONSTRAINT "admin_verification_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_change" ADD CONSTRAINT "email_change_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_at_idx" ON "admin_audit" USING btree ("at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_target_idx" ON "admin_audit" USING btree ("target_user_id");--> statement-breakpoint
-- Row-level security: admin tables are not user-scoped; the policy lets the runtime role through.
-- No TO clause: migrations never name the runtime role (see grantAppRole), and the owner bypasses RLS.
ALTER TABLE "admin_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY admin_rw ON "admin_audit" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "admin_verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY admin_rw ON "admin_verification" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "email_change" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY admin_rw ON "email_change" FOR ALL USING (true) WITH CHECK (true);
