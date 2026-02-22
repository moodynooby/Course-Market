CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth0_user_id" varchar(255) NOT NULL,
	"user_display_name" varchar(255) NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_avatar_url" text,
	"course_code" varchar(50) NOT NULL,
	"course_name" varchar(255),
	"section_offered" varchar(20) NOT NULL,
	"section_wanted" varchar(20) NOT NULL,
	"action" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"description" text,
	"contact_phone" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
