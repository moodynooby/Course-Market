import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';

// Trades table with Auth0 user identification
export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),

  // Auth0 user identification (no foreign key!)
  auth0UserId: varchar('auth0_user_id', { length: 255 }).notNull(),
  userDisplayName: varchar('user_display_name', { length: 255 }).notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  userAvatarUrl: text('user_avatar_url'),

  // Trade details
  courseCode: varchar('course_code', { length: 50 }).notNull(),
  courseName: varchar('course_name', { length: 255 }),
  sectionOffered: varchar('section_offered', { length: 20 }).notNull(),
  sectionWanted: varchar('section_wanted', { length: 20 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('open').notNull(),
  description: text('description'),
  contactPhone: varchar('contact_phone', { length: 20 }).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
