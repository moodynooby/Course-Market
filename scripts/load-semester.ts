import { neon } from '@netlify/neon';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '../db/schema';

const client = neon();
const db = drizzle({ client, schema });

async function loadSemester(fileName: string) {
  const semestersDir = path.join(process.cwd(), 'public', 'semesters');
  const filePath = path.join(semestersDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File '${fileName}' not found in ${semestersDir}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  const { semesterId: rawSemesterId, semesterName, sections } = data;

  if (!sections || !Array.isArray(sections)) {
    console.error('Error: JSON must contain a sections array');
    process.exit(1);
  }

  const semesterId = (rawSemesterId || fileName.replace('.json', '')).toLowerCase();
  console.log(`Loading semester: ${semesterId} (${semesterName || fileName})`);
  console.log(`Found ${sections.length} sections`);

  console.log('Deleting existing data for semester...');
  await db.delete(schema.sections).where(eq(schema.sections.semesterId, semesterId));
  await db.delete(schema.courses).where(eq(schema.courses.semesterId, semesterId));
  await db.delete(schema.timeSlots).where(eq(schema.timeSlots.sectionId, `${semesterId}-dummy`));

  await db
    .insert(schema.semesters)
    .values({
      id: semesterId,
      name: semesterName || fileName.replace('.json', ''),
      jsonUrl: `/semesters/${fileName}`,
      isActive: true,
      loadedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.semesters.id,
      set: {
        name: semesterName || fileName.replace('.json', ''),
        jsonUrl: `/semesters/${fileName}`,
        isActive: true,
        loadedAt: new Date(),
      },
    });

  await db
    .update(schema.semesters)
    .set({ isActive: false })
    .where(eq(schema.semesters.id, semesterId));

  const coursesMap = new Map();
  sections.forEach((section: any) => {
    const courseCode = section.courseCode;
    if (!coursesMap.has(courseCode)) {
      const credits = section.credits;
      coursesMap.set(courseCode, {
        code: courseCode,
        name: section.courseName,
        subject: section.subject,
        credits: typeof credits === 'number' ? Math.floor(credits) : 0,
        description: section.description || null,
      });
    }
  });

  const coursesData = Array.from(coursesMap.entries()).map(([_code, course]: [string, any]) => ({
    semesterId,
    code: course.code,
    name: course.name,
    subject: course.subject,
    credits: course.credits,
    description: course.description,
  }));

  if (coursesData.length > 0) {
    console.log('Inserting courses...');
    const batchSize = 100;
    const insertedCourses: (typeof schema.courses.$inferSelect)[] = [];

    for (let i = 0; i < coursesData.length; i += batchSize) {
      const batch = coursesData.slice(i, i + batchSize);
      const result = await db.insert(schema.courses).values(batch).returning();
      insertedCourses.push(...result);
      console.log(
        `  Inserted ${Math.min(i + batchSize, coursesData.length)}/${coursesData.length} courses`,
      );
    }

    const courseCodeToId = new Map(insertedCourses.map((c) => [c.code.replace(/\s+/g, ''), c.id]));

    console.log('Inserting sections...');
    const seenSectionIds = new Set<string>();
    const sectionsData = sections
      .map((section: any, index: number) => {
        const courseCodeNoSpace = section.courseCode.replace(/\s+/g, '');
        const baseId = section.id || `${courseCodeNoSpace}-${section.sectionNumber}-${semesterId}`;

        let sectionId = baseId;
        let counter = 1;
        while (seenSectionIds.has(sectionId)) {
          sectionId = `${baseId}-${counter}`;
          counter++;
        }
        seenSectionIds.add(sectionId);

        const courseId = courseCodeToId.get(courseCodeNoSpace);

        return {
          id: sectionId,
          courseId: courseId!,
          semesterId,
          sectionNumber: section.sectionNumber,
          instructor: section.instructor || null,
          capacity: section.capacity || null,
          enrolled: section.enrolled || null,
          jsonIndex: index,
        };
      })
      .filter((s): s is typeof s & { courseId: number } => s.courseId !== undefined);

    if (sectionsData.length > 0) {
      for (let i = 0; i < sectionsData.length; i += batchSize) {
        const batch = sectionsData.slice(i, i + batchSize);
        await db
          .insert(schema.sections)
          .values(batch)
          .onConflictDoUpdate({
            target: schema.sections.id,
            set: {
              courseId: schema.sections.courseId,
              semesterId: schema.sections.semesterId,
              sectionNumber: schema.sections.sectionNumber,
              instructor: schema.sections.instructor,
              capacity: schema.sections.capacity,
              enrolled: schema.sections.enrolled,
              jsonIndex: schema.sections.jsonIndex,
            },
          });
        console.log(
          `  Inserted/updated ${Math.min(i + batchSize, sectionsData.length)}/${sectionsData.length} sections`,
        );
      }

      console.log('Inserting time slots...');
      const timeSlotsData: any[] = [];
      sections.forEach((section: any, sectionIndex: number) => {
        if (section.timeSlots && Array.isArray(section.timeSlots)) {
          const sectionId = sectionsData[sectionIndex]?.id;
          if (sectionId) {
            section.timeSlots.forEach((slot: any) => {
              timeSlotsData.push({
                sectionId,
                day: slot.day,
                startTime: slot.startTime,
                endTime: slot.endTime,
              });
            });
          }
        }
      });

      if (timeSlotsData.length > 0) {
        for (let i = 0; i < timeSlotsData.length; i += batchSize) {
          const batch = timeSlotsData.slice(i, i + batchSize);
          await db.insert(schema.timeSlots).values(batch);
        }
        console.log(`  Inserted ${timeSlotsData.length} time slots`);
      }

      console.log(
        `Successfully loaded ${coursesData.length} courses and ${sectionsData.length} sections`,
      );
    } else {
      console.log(`Successfully loaded ${coursesData.length} courses (0 sections)`);
    }
  }
}

const fileName = process.argv[2];
if (!fileName) {
  console.error('Usage: pnpm run load-semester <filename.json>');
  console.error('Example: pnpm run load-semester Winter2025.json');
  process.exit(1);
}

loadSemester(fileName)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
