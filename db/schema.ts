import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

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
  encryptedKey: text('encrypted_key').notNull(),
  iv: varchar('iv', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserLlmKey = typeof userLlmKeys.$inferSelect;
export type NewUserLlmKey = typeof userLlmKeys.$inferInsert;
