import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Initialize database connection
const client = neon();

export const db = drizzle({
  schema,
  client,
});

// Database utility functions
export async function getUserByEmail(email: string) {
  return await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });
}

export async function getUserByProviderId(provider: string, providerId: string) {
  return await db.query.users.findFirst({
    where: (users, { and, eq }) => and(
      eq(users.provider, provider),
      eq(users.providerId, providerId)
    ),
  });
}

export async function createUser(data: schema.NewUser) {
  const [result] = await db.insert(schema.users).values(data).returning();
  return result;
}

export async function updateUserPreferences(userId: number, preferences: Partial<schema.UserPreference>) {
  const [result] = await db
    .insert(schema.userPreferences)
    .values({ ...preferences, userId })
    .onConflictDoUpdate({
      target: schema.userPreferences.userId,
      set: { ...preferences, updatedAt: new Date() },
    })
    .returning();
  return result;
}

export async function getUserPreferences(userId: number) {
  return await db.query.userPreferences.findFirst({
    where: (pref, { eq }) => eq(pref.userId, userId),
  });
}

export async function createCourseWithSections(userId: number, courseData: schema.Course, sectionsData: schema.Section[]) {
  const [course] = await db.insert(schema.courses).values({ ...courseData, userId }).returning();

  if (sectionsData.length > 0) {
    const sectionsWithCourseId = sectionsData.map(section => ({ ...section, courseId: course.id }));
    await db.insert(schema.sections).values(sectionsWithCourseId);
  }

  return course;
}

export async function getUserCoursesWithSections(userId: number) {
  return await db.query.courses.findMany({
    where: (courses, { eq }) => eq(courses.userId, userId),
    with: {
      sections: true,
    },
  });
}

export async function getUserSelectedSections(userId: number) {
  return await db.query.userSelections.findMany({
    where: (sel, { eq }) => eq(sel.userId, userId),
    with: {
      section: {
        with: {
          course: true,
        },
      },
    },
  });
}

export async function createTrade(data: schema.Trade) {
  const [result] = await db.insert(schema.trades).values(data).returning();
  return result;
}

export async function getUserTrades(userId: number) {
  return await db.query.trades.findMany({
    where: (trades, { eq }) => eq(trades.userId, userId),
    orderBy: (trades, { desc }) => desc(trades.createdAt),
  });
}

export async function getAllTrades() {
  return await db.query.trades.findMany({
    with: {
      user: true,
    },
    orderBy: (trades, { desc }) => desc(trades.createdAt),
  });
}

export async function createContactRequest(data: schema.ContactRequest) {
  const [result] = await db.insert(schema.contactRequests).values(data).returning();
  return result;
}