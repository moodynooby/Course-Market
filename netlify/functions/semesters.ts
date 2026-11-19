import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { courseColumns, sectionColumns, toCourse, toSection } from './lib/catalog';
import { cacheHeaders, jsonResponse } from './lib/response';
import { withCors } from './lib/wrap';

export const handler = withCors(async (event) => {
  const { httpMethod, path } = event;
  const pathParts = path.split('/').filter(Boolean);

  if (httpMethod === 'GET') {
    if (path.endsWith('/data')) {
      const semesterId = pathParts[pathParts.length - 2];

      const courses = await db
        .select(courseColumns)
        .from(schema.semesterCourses)
        .where(eq(schema.semesterCourses.semesterId, semesterId));

      const sections = await db
        .select(sectionColumns)
        .from(schema.semesterSections)
        .where(eq(schema.semesterSections.semesterId, semesterId));

      const courseList = courses.map(toCourse);
      const sectionList = sections.map(toSection);

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
});
