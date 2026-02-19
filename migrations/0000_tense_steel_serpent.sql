CREATE TABLE "contact_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"trade_id" integer,
	"message" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(50) NOT NULL,
	"credits" integer DEFAULT 3,
	"description" text,
	"source_csv" varchar(255),
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"section_number" varchar(20) NOT NULL,
	"instructor" varchar(255) DEFAULT 'TBA',
	"location" varchar(255) DEFAULT 'TBA',
	"days" varchar(20) NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10) NOT NULL,
	"capacity" integer DEFAULT 30,
	"enrolled" integer DEFAULT 0,
	"term" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"course_code" varchar(50) NOT NULL,
	"course_name" varchar(255),
	"section_offered" varchar(20) NOT NULL,
	"section_wanted" varchar(20) NOT NULL,
	"action" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'open',
	"description" text,
	"contact_phone" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"preferred_start_time" varchar(10) DEFAULT '08:00',
	"preferred_end_time" varchar(10) DEFAULT '17:00',
	"max_gap_minutes" integer DEFAULT 60,
	"prefer_consecutive_days" boolean DEFAULT true,
	"prefer_morning" boolean DEFAULT false,
	"prefer_afternoon" boolean DEFAULT false,
	"max_credits" integer DEFAULT 18,
	"min_credits" integer DEFAULT 12,
	"avoid_days" jsonb DEFAULT '[]'::jsonb,
	"exclude_instructors" jsonb DEFAULT '[]'::jsonb,
	"theme" varchar(20) DEFAULT 'system',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"section_id" integer NOT NULL,
	"selected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"avatar_url" text,
	"provider" varchar(50) DEFAULT 'email' NOT NULL,
	"provider_id" varchar(255),
	"phone_number" varchar(20),
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_selections" ADD CONSTRAINT "user_selections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_selections" ADD CONSTRAINT "user_selections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;