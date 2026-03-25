CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" varchar(50) NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(50) NOT NULL,
	"credits" integer NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"semester_id" varchar(50) NOT NULL,
	"section_number" varchar(20) NOT NULL,
	"instructor" varchar(255),
	"capacity" integer,
	"enrolled" integer,
	"json_index" integer
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"json_url" varchar(255),
	"is_active" boolean DEFAULT true,
	"loaded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"auth0_user_id" varchar(255) PRIMARY KEY NOT NULL,
	"user_display_name" varchar(255) NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"contact_phone" varchar(20) NOT NULL,
	"semester_id" varchar(50),
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
