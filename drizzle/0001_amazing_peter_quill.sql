CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"body_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"response" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_idem_expires" ON "idempotency_keys" USING btree ("expires_at");