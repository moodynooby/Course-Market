import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
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
  status: varchar('status', { length: 20 }).default('open').notNull(),
  description: text('description'),
  contactPhone: varchar('contact_phone', { length: 20 }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;

export const userLlmKeys = pgTable(
  'user_llm_keys',
  {
    auth0UserId: varchar('auth0_user_id', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    apiKey: text('api_key').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.auth0UserId, t.provider] }),
  }),
);

export type UserLlmKey = typeof userLlmKeys.$inferSelect;
export type NewUserLlmKey = typeof userLlmKeys.$inferInsert;

export const userProfiles = pgTable('user_profiles', {
  auth0UserId: varchar('auth0_user_id', { length: 255 }).primaryKey(),
  phone: varchar('contact_phone', { length: 20 }).notNull(),
  semesterId: varchar('semester_id', { length: 50 }),
  preferences: jsonb('preferences'),
  courseSelections: jsonb('course_selections'),
  llmConfig: jsonb('llm_config'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export const semesters = pgTable('semesters', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  jsonUrl: varchar('json_url', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Semester = typeof semesters.$inferSelect;
export type NewSemester = typeof semesters.$inferInsert;

export const professors = pgTable('professors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  department: varchar('department', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Professor = typeof professors.$inferSelect;
export type NewProfessor = typeof professors.$inferInsert;

export const professorRatings = pgTable('professor_ratings', {
  id: serial('id').primaryKey(),
  professorId: integer('professor_id')
    .notNull()
    .references(() => professors.id),
  auth0UserId: varchar('auth0_user_id', { length: 255 }).notNull(),
  rating: integer('rating').notNull(), // 1-5
  difficulty: integer('difficulty').notNull(), // 1-5
  comment: text('comment').notNull(),
  courseCode: varchar('course_code', { length: 50 }).notNull(),
  semesterId: varchar('semester_id', { length: 50 }).notNull(),
  takeAgain: boolean('take_again').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ProfessorRating = typeof professorRatings.$inferSelect;
export type NewProfessorRating = typeof professorRatings.$inferInsert;
