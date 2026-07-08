import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { cacheHeaders, corsResponse, jsonResponse, secureErrorResponse } from './lib/response';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  try {
    const { httpMethod, path } = event;
    const pathParts = path.split('/').filter(Boolean);

    if (httpMethod === 'GET') {
      if (path.endsWith('/data')) {
        const semesterId = pathParts[pathParts.length - 2];

        const courses = await db
          .select()
          .from(schema.semesterCourses)
          .where(eq(schema.semesterCourses.semesterId, semesterId));

        const sections = await db
          .select()
          .from(schema.semesterSections)
          .where(eq(schema.semesterSections.semesterId, semesterId));

        const courseList = courses.map((c) => ({
          id: c.id,
          code: c.courseCode,
          name: c.name,
          subject: c.subject,
          credits: c.credits,
          description: c.description ?? undefined,
        }));

        const sectionList = sections.map((s) => ({
          id: s.id,
          courseId: s.courseId,
          sectionNumber: s.sectionNumber,
          instructor: s.instructor,
          timeSlots: s.timeSlots as Array<{
            day: string;
            startTime: string;
            endTime: string;
            startDate?: string;
            endDate?: string;
          }>,
          capacity: s.capacity,
          enrolled: s.enrolled,
        }));

        return jsonResponse(200, { courses: courseList, sections: sectionList }, cacheHeaders);
      }

      const semesters = await db
        .select({
          id: schema.semesters.id,
          name: schema.semesters.name,
          isActive: schema.semesters.isActive,
          createdAt: schema.semesters.createdAt,
        })
        .from(schema.semesters)
        .orderBy(desc(schema.semesters.createdAt));

      return jsonResponse(200, { semesters }, cacheHeaders);
    }

    return jsonResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    return secureErrorResponse(error);
  }
};
