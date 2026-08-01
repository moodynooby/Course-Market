import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
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

export const userProfiles = pgTable('user_profiles', {
  auth0UserId: varchar('auth0_user_id', { length: 255 }).primaryKey(),
  phone: varchar('contact_phone', { length: 20 }).notNull(),
  semesterId: varchar('semester_id', { length: 50 }),
  preferences: jsonb('preferences'),
  courseSelections: jsonb('course_selections'),
  pinnedSelections: jsonb('pinned_selections'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export const semesters = pgTable('semesters', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Semester = typeof semesters.$inferSelect;
export type NewSemester = typeof semesters.$inferInsert;

export const professors = pgTable('professors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Professor = typeof professors.$inferSelect;
export type NewProfessor = typeof professors.$inferInsert;

export const professorRatings = pgTable(
  'professor_ratings',
  {
    id: serial('id').primaryKey(),
    professorId: integer('professor_id')
      .notNull()
      .references(() => professors.id),
    auth0UserId: varchar('auth0_user_id', { length: 255 }).notNull(),
    rating: integer('rating').notNull(),
    difficulty: integer('difficulty').notNull(),
    comment: text('comment').notNull(),
    courseCode: varchar('course_code', { length: 50 }).notNull(),
    semesterId: varchar('semester_id', { length: 50 }).notNull(),
    takeAgain: boolean('take_again').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    professorIdIdx: index('idx_professor_ratings_professor_id').on(t.professorId),
    createdAtIdx: index('idx_professor_ratings_created_at').on(t.createdAt),
    // One rating per (user, professor); subsequent submissions overwrite the prior row.
    userProfessorUnique: uniqueIndex('uniq_professor_ratings_user_professor').on(
      t.auth0UserId,
      t.professorId,
    ),
  }),
);

export type ProfessorRating = typeof professorRatings.$inferSelect;
export type NewProfessorRating = typeof professorRatings.$inferInsert;

export const semesterCourses = pgTable('semester_courses', {
  id: varchar('id', { length: 255 }).primaryKey(),
  courseCode: varchar('course_code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 50 }).notNull(),
  credits: doublePrecision('credits').notNull().default(0),
  description: text('description'),
  semesterId: varchar('semester_id', { length: 50 })
    .notNull()
    .references(() => semesters.id),
});

export type SemesterCourse = typeof semesterCourses.$inferSelect;
export type NewSemesterCourse = typeof semesterCourses.$inferInsert;

export const semesterSections = pgTable('semester_sections', {
  id: varchar('id', { length: 255 }).primaryKey(),
  courseId: varchar('course_id', { length: 255 })
    .notNull()
    .references(() => semesterCourses.id),
  sectionNumber: varchar('section_number', { length: 20 }).notNull(),
  instructor: varchar('instructor', { length: 255 }).notNull().default(''),
  capacity: integer('capacity').notNull().default(0),
  enrolled: integer('enrolled').notNull().default(0),
  timeSlots: jsonb('time_slots').notNull().default([]),
  semesterId: varchar('semester_id', { length: 50 })
    .notNull()
    .references(() => semesters.id),
});

export type SemesterSection = typeof semesterSections.$inferSelect;
export type NewSemesterSection = typeof semesterSections.$inferInsert;
