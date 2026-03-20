CREATE TABLE "user_llm_keys" (
	"auth0_user_id" varchar(255) PRIMARY KEY NOT NULL,
	"provider" varchar(50) NOT NULL,
	"encrypted_key" text NOT NULL,
	"iv" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "contact_phone" SET NOT NULL;