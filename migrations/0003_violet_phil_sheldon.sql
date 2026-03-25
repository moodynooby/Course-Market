CREATE TABLE "time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" varchar(100) NOT NULL,
	"day" varchar(2) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL
);
