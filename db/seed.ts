/**
 * Seed semester courses and sections from generated semester JSON files.
 *
 * The import is a full refresh: the semester row is created/updated first (courses and
 * sections reference it), courses and sections are upserted, and rows that disappeared
 * from the directory file are deleted. Re-running the importer therefore leaves the
 * database matching the source file exactly. Every run verifies the resulting row counts.
 *
 * Usage:
 *   pnpm run db:seed                          # all .import/semesters/*.json
 *   pnpm run db:seed -- .import/semesters/Winter2027.json
 *
 * Files seeded from `.import/semesters/` are scratch artifacts and are deleted afterwards.
 */
import { readdirSync, readFileSync, rmdirSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { db } from './index';
import {
  type NewSemesterCourse,
  type NewSemesterSection,
  semesterCourses,
  semesterSections,
  semesters,
} from './schema';

const WRITE_CHUNK_SIZE = 500;
const IMPORT_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.import',
  'semesters',
);

interface TimeSlotJSON {
  day: string;
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
}

interface SectionJSON {
  id: string;
  courseCode: string;
  courseName: string;
  sectionNumber: string;
  instructor: string;
  credits: number;
  subject: string;
  capacity: number;
  enrolled: number;
  timeSlots: TimeSlotJSON[];
  description?: string | null;
}

interface SemesterJSONFile {
  semesterId: string;
  semesterName: string;
  sections: SectionJSON[];
}

function chunk<T>(items: T[], size = WRITE_CHUNK_SIZE): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function pruneEmptyDirectory(directory: string) {
  try {
    if (readdirSync(directory).length === 0) {
      rmdirSync(directory);
    }
  } catch {
    // The directory was already removed; nothing left to prune.
  }
}

/** Delete a seeded file when it lives in the scratch import directory. */
function removeScratchFile(filePath: string) {
  const relativePath = relative(IMPORT_DIRECTORY, filePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return false;
  }
  rmSync(filePath, { force: true });
  return true;
}

async function seedFromFile(filePath: string) {
  let data: SemesterJSONFile;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${filePath}: could not read semester JSON (${reason})`);
  }
  const { semesterId, semesterName } = data;

  if (!semesterId || !semesterName) {
    throw new Error(`${filePath}: semesterId and semesterName are required`);
  }
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    throw new Error(`${filePath}: no sections to seed`);
  }

  console.log(`\nSeeding ${semesterId} ("${semesterName}") from ${filePath}`);

  const coursesById = new Map<string, NewSemesterCourse>();
  const sections: NewSemesterSection[] = [];
  const sectionIds = new Set<string>();

  for (const section of data.sections) {
    if (!section.id || !section.courseCode || !section.courseName) {
      throw new Error(`${filePath}: section is missing id, courseCode, or courseName`);
    }

    const courseId = `${semesterId}:${section.courseCode}`;

    if (!coursesById.has(courseId)) {
      coursesById.set(courseId, {
        id: courseId,
        courseCode: section.courseCode,
        name: section.courseName,
        subject: section.subject,
        credits: section.credits,
        description: section.description ?? undefined,
        semesterId,
      });
    }

    if (sectionIds.has(section.id)) {
      throw new Error(`${filePath}: duplicate section id ${section.id}`);
    }
    sectionIds.add(section.id);

    sections.push({
      id: section.id,
      courseId,
      sectionNumber: section.sectionNumber,
      instructor: section.instructor || '',
      capacity: section.capacity || 0,
      enrolled: section.enrolled || 0,
      timeSlots: section.timeSlots,
      semesterId,
    });
  }

  const courses = Array.from(coursesById.values());

  await db
    .insert(semesters)
    .values({ id: semesterId, name: semesterName })
    .onConflictDoUpdate({
      target: semesters.id,
      set: { name: semesterName },
    });

  const removedSections = await db
    .delete(semesterSections)
    .where(
      and(
        eq(semesterSections.semesterId, semesterId),
        notInArray(semesterSections.id, Array.from(sectionIds)),
      ),
    )
    .returning({ id: semesterSections.id });

  for (const batch of chunk(courses)) {
    await db
      .insert(semesterCourses)
      .values(batch)
      .onConflictDoUpdate({
        target: semesterCourses.id,
        set: {
          courseCode: sql`excluded.course_code`,
          name: sql`excluded.name`,
          subject: sql`excluded.subject`,
          credits: sql`excluded.credits`,
          description: sql`excluded.description`,
          semesterId: sql`excluded.semester_id`,
        },
      });
  }

  for (const batch of chunk(sections)) {
    await db
      .insert(semesterSections)
      .values(batch)
      .onConflictDoUpdate({
        target: semesterSections.id,
        set: {
          courseId: sql`excluded.course_id`,
          sectionNumber: sql`excluded.section_number`,
          instructor: sql`excluded.instructor`,
          capacity: sql`excluded.capacity`,
          enrolled: sql`excluded.enrolled`,
          timeSlots: sql`excluded.time_slots`,
          semesterId: sql`excluded.semester_id`,
        },
      });
  }

  const removedCourses = await db
    .delete(semesterCourses)
    .where(
      and(
        eq(semesterCourses.semesterId, semesterId),
        notInArray(
          semesterCourses.id,
          courses.map((course) => course.id),
        ),
      ),
    )
    .returning({ id: semesterCourses.id });

  const [courseCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(semesterCourses)
    .where(eq(semesterCourses.semesterId, semesterId));
  const [sectionCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(semesterSections)
    .where(eq(semesterSections.semesterId, semesterId));

  if (courseCount?.total !== courses.length || sectionCount?.total !== sections.length) {
    throw new Error(
      `${semesterId}: expected ${courses.length} courses / ${sections.length} sections, ` +
        `database has ${courseCount?.total ?? 0} / ${sectionCount?.total ?? 0}`,
    );
  }

  console.log(`  Upserted ${courses.length} courses and ${sections.length} sections`);
  if (removedSections.length > 0 || removedCourses.length > 0) {
    console.log(
      `  Removed ${removedSections.length} stale sections and ${removedCourses.length} stale courses`,
    );
  }
  console.log('  Verified row counts match the source file');
}

async function seed() {
  const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

  let targets: string[];
  if (files.length > 0) {
    targets = files.map((file) => resolve(file));
  } else {
    let entries: string[];
    try {
      entries = readdirSync(IMPORT_DIRECTORY)
        .filter((entry) => entry.endsWith('.json'))
        .sort();
    } catch {
      throw new Error(
        `No import directory found at ${IMPORT_DIRECTORY}. Generate one with scripts/csv_to_semester_json.py first.`,
      );
    }
    if (entries.length === 0) {
      throw new Error(
        `No semester JSON files in ${IMPORT_DIRECTORY}. Generate one with scripts/csv_to_semester_json.py first.`,
      );
    }
    targets = entries.map((entry) => join(IMPORT_DIRECTORY, entry));
  }

  for (const file of targets) {
    await seedFromFile(file);
  }

  const removed = targets.filter(removeScratchFile).length;
  if (removed > 0) {
    pruneEmptyDirectory(IMPORT_DIRECTORY);
    pruneEmptyDirectory(dirname(IMPORT_DIRECTORY));
  }

  console.log(`\nSeed complete: ${targets.length} semester file(s).`);
  if (removed > 0) {
    console.log(`Removed ${removed} scratch import file(s).`);
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
