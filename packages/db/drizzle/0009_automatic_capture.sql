ALTER TYPE "public"."transaction_source" ADD VALUE 'capture';--> statement-breakpoint
CREATE TABLE "merchant_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"merchant_key" text NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "system_key" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "capture_source" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "capture_merchant_key" text;--> statement-breakpoint
ALTER TABLE "merchant_categories" ADD CONSTRAINT "merchant_categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_categories" ADD CONSTRAINT "merchant_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_categories_key" ON "merchant_categories" USING btree ("user_id","merchant_key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_system_key" ON "categories" USING btree ("user_id","kind","system_key") WHERE "categories"."system_key" is not null and "categories"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "transactions_user_capture" ON "transactions" USING btree ("user_id","captured_at") WHERE "transactions"."captured_at" is not null;--> statement-breakpoint
ALTER TABLE "merchant_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "merchant_categories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY tenant_isolation ON "merchant_categories" FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));