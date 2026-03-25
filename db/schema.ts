import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';

export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),

  auth0UserId: varchar('auth0_user_id', { length: 255 }).notNull(),
  userDisplayName: varchar('user_display_name', { length: 255 }).notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  userAvatarUrl: text('user_avatar_url'),

  courseCode: varchar('course_code', { length: 50 }).notNull(),
  courseName: varchar('course_name', { length: 255 }),
  sectionOffered: varchar('section_offered', { length: 20 }).notNull(),
  sectionWanted: varchar('section_wanted', { length: 20 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('open').notNull(),
  description: text('description'),
  contactPhone: varchar('contact_phone', { length: 20 }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;

export const userLlmKeys = pgTable('user_llm_keys', {
  auth0UserId: varchar('auth0_user_id', { length: 255 }).primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),
  apiKey: text('api_key').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserLlmKey = typeof userLlmKeys.$inferSelect;
export type NewUserLlmKey = typeof userLlmKeys.$inferInsert;

// User profiles for onboarding
export const userProfiles = pgTable('user_profiles', {
  auth0UserId: varchar('auth0_user_id', { length: 255 }).primaryKey(),
  displayName: varchar('user_display_name', { length: 255 }).notNull(),
  email: varchar('user_email', { length: 255 }).notNull(),
  phone: varchar('contact_phone', { length: 20 }).notNull(),
  semesterId: varchar('semester_id', { length: 50 }),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

// Semesters metadata
export const semesters = pgTable('semesters', {
  id: varchar('id', { length: 50 }).primaryKey(), // e.g., 'winter_2025'
  name: varchar('name', { length: 100 }).notNull(), // 'Winter Semester 2025'
  jsonUrl: varchar('json_url', { length: 255 }), // '/semesters/winter_2025_sections.json'
  isActive: boolean('is_active').default(true),
  loadedAt: timestamp('loaded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Semester = typeof semesters.$inferSelect;
export type NewSemester = typeof semesters.$inferInsert;

// Courses (lightweight, indexed for fast filtering)
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  semesterId: varchar('semester_id', { length: 50 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(), // 'CS 101'
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 50 }).notNull(), // 'CS'
  credits: integer('credits').notNull(),
  description: text('description'),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

// Sections index (minimal data, full details in JSON)
export const sections = pgTable('sections', {
  id: varchar('id', { length: 100 }).primaryKey(), // custom ID: 'CS101-001-winter2025'
  courseId: integer('course_id').notNull(),
  semesterId: varchar('semester_id', { length: 50 }).notNull(),
  sectionNumber: varchar('section_number', { length: 20 }).notNull(),
  instructor: varchar('instructor', { length: 255 }),
  capacity: integer('capacity'),
  enrolled: integer('enrolled'),
  jsonIndex: integer('json_index'), // Index into sections array in JSON
});

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;

// Time slots for sections (stored separately for normalization)
export const timeSlots = pgTable('time_slots', {
  id: serial('id').primaryKey(),
  sectionId: varchar('section_id', { length: 100 }).notNull(),
  day: varchar('day', { length: 2 }).notNull(), // M, T, W, Th, F, Sa, Su
  startTime: varchar('start_time', { length: 5 }).notNull(), // HH:MM
  endTime: varchar('end_time', { length: 5 }).notNull(), // HH:MM
});

export type TimeSlot = typeof timeSlots.$inferSelect;
export type NewTimeSlot = typeof timeSlots.$inferInsert;
