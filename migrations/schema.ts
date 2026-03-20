import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const trades = pgTable('trades', {
  id: serial().primaryKey().notNull(),
  auth0UserId: varchar('auth0_user_id', { length: 255 }).notNull(),
  courseCode: varchar('course_code', { length: 50 }).notNull(),
  courseName: varchar('course_name', { length: 255 }),
  sectionOffered: varchar('section_offered', { length: 20 }).notNull(),
  sectionWanted: varchar('section_wanted', { length: 20 }).notNull(),
  action: varchar({ length: 20 }).notNull(),
  status: varchar({ length: 20 }).default('open').notNull(),
  description: text(),
  contactPhone: varchar('contact_phone', { length: 20 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  userDisplayName: varchar('user_display_name', { length: 255 }).notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  userAvatarUrl: text('user_avatar_url'),
});
