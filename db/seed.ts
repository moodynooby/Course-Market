import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index';
import {
  type NewSemesterCourse,
  type NewSemesterSection,
  semesterCourses,
  semesterSections,
} from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
}

interface SemesterJSONFile {
  semesterId: string;
  semesterName: string;
  sections: SectionJSON[];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const files: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--')) continue;
    files.push(arg);
  }

  return { files };
}

async function seedFromFile(filePath: string) {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    console.warn(`Skipping ${filePath}: file not found`);
    return;
  }

  const data: SemesterJSONFile = JSON.parse(raw);
  const { semesterId } = data;

  console.log(`Seeding ${semesterId} from ${filePath}...`);

  const coursesMap = new Map<string, NewSemesterCourse>();
  const sectionsToInsert: NewSemesterSection[] = [];

  for (const section of data.sections) {
    const courseId = `${semesterId}:${section.courseCode}`;

    if (!coursesMap.has(courseId)) {
      coursesMap.set(courseId, {
        id: courseId,
        courseCode: section.courseCode,
        name: section.courseName,
        subject: section.subject,
        credits: section.credits,
        description: undefined,
        semesterId,
      });
    }

    sectionsToInsert.push({
      id: section.id,
      courseId,
      sectionNumber: section.sectionNumber,
      instructor: section.instructor || '',
      capacity: section.capacity || 0,
      enrolled: section.enrolled || 0,
      timeSlots: section.timeSlots as NewSemesterSection['timeSlots'],
      semesterId,
    });
  }

  if (coursesMap.size > 0) {
    await db.insert(semesterCourses).values(Array.from(coursesMap.values())).onConflictDoNothing();
    console.log(`  Inserted ${coursesMap.size} courses`);
  }

  if (sectionsToInsert.length > 0) {
    await db.insert(semesterSections).values(sectionsToInsert).onConflictDoNothing();
    console.log(`  Inserted ${sectionsToInsert.length} sections`);
  }
}

async function seed() {
  const { files } = parseArgs();

  if (files.length > 0) {
    for (const f of files) {
      await seedFromFile(f);
    }
  } else {
    const defaultDir = join(__dirname, '..', 'public', 'semesters');
    const defaults = ['Monsoon2026.json', 'Winter2025.json'];
    for (const entry of defaults) {
      await seedFromFile(join(defaultDir, entry));
    }
  }

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
