import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table with OAuth support
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  provider: varchar('provider', { length: 50 }).notNull().default('email'), // 'google', 'github', 'email', 'phone'
  providerId: varchar('provider_id', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User preferences
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  preferredStartTime: varchar('preferred_start_time', { length: 10 }).default('08:00'),
  preferredEndTime: varchar('preferred_end_time', { length: 10 }).default('17:00'),
  maxGapMinutes: integer('max_gap_minutes').default(60),
  preferConsecutiveDays: boolean('prefer_consecutive_days').default(true),
  preferMorning: boolean('prefer_morning').default(false),
  preferAfternoon: boolean('prefer_afternoon').default(false),
  maxCredits: integer('max_credits').default(18),
  minCredits: integer('min_credits').default(12),
  avoidDays: jsonb('avoid_days').default([]),
  excludeInstructors: jsonb('exclude_instructors').default([]),
  theme: varchar('theme', { length: 20 }).default('system'), // 'light', 'dark', 'system'
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Courses imported from CSV
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 50 }).notNull(),
  credits: integer('credits').default(3),
  description: text('description'),
  sourceCsv: varchar('source_csv', { length: 255 }), // original filename
  importedAt: timestamp('imported_at').defaultNow().notNull(),
});

// Course sections
export const sections = pgTable('sections', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id).notNull(),
  sectionNumber: varchar('section_number', { length: 20 }).notNull(),
  instructor: varchar('instructor', { length: 255 }).default('TBA'),
  location: varchar('location', { length: 255 }).default('TBA'),
  days: varchar('days', { length: 20 }).notNull(),
  startTime: varchar('start_time', { length: 10 }).notNull(),
  endTime: varchar('end_time', { length: 10 }).notNull(),
  capacity: integer('capacity').default(30),
  enrolled: integer('enrolled').default(0),
  term: varchar('term', { length: 50 }),
});

// User selected sections
export const userSelections = pgTable('user_selections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sectionId: integer('section_id').references(() => sections.id).notNull(),
  selectedAt: timestamp('selected_at').defaultNow().notNull(),
});

// Trade posts
export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  courseCode: varchar('course_code', { length: 50 }).notNull(),
  courseName: varchar('course_name', { length: 255 }),
  sectionOffered: varchar('section_offered', { length: 20 }).notNull(),
  sectionWanted: varchar('section_wanted', { length: 20 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(), // 'offer', 'request'
  status: varchar('status', { length: 20 }).default('open'), // 'open', 'pending', 'completed', 'cancelled'
  description: text('description'),
  contactPhone: varchar('contact_phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User contact requests
export const contactRequests = pgTable('contact_requests', {
  id: serial('id').primaryKey(),
  fromUserId: integer('from_user_id').references(() => users.id).notNull(),
  toUserId: integer('to_user_id').references(() => users.id).notNull(),
  tradeId: integer('trade_id').references(() => trades.id),
  message: text('message'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  courses: many(courses),
  trades: many(trades),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  user: one(users, {
    fields: [courses.userId],
    references: [users.id],
  }),
  sections: many(sections),
}));

export const sectionsRelations = relations(sections, ({ one }) => ({
  course: one(courses, {
    fields: [sections.courseId],
    references: [courses.id],
  }),
}));

export const userSelectionsRelations = relations(userSelections, ({ one }) => ({
  user: one(users, {
    fields: [userSelections.userId],
    references: [users.id],
  }),
  section: one(sections, {
    fields: [userSelections.sectionId],
    references: [sections.id],
  }),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
}));

export const contactRequestsRelations = relations(contactRequests, ({ one }) => ({
  fromUser: one(users, {
    fields: [contactRequests.fromUserId],
    references: [users.id],
  }),
  trade: one(trades, {
    fields: [contactRequests.tradeId],
    references: [trades.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type ContactRequest = typeof contactRequests.$inferSelect;
