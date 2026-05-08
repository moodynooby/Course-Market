import { generateSchedules } from '../utils/schedule-generator';
import { basePreferences, makeSection, makeTimeSlot } from './performance-helpers';
import type { Course, Section } from '../types';

function runBenchmark() {
  const nCourses = 8;
  const nSectionsPerCourse = 4;

  const courses: Course[] = Array.from({ length: nCourses }, (_, i) => ({
    id: `c${i}`,
    code: `CS${100 + i}`,
    name: `Course ${i}`,
    credits: 3,
    description: '',
    subject: 'CS',
  }));

  const sectionsByCourse = new Map<string, Section[]>();
  const days: ('M' | 'T' | 'W' | 'Th' | 'F')[] = ['M', 'T', 'W', 'Th', 'F'];

  courses.forEach((course, i) => {
    const sections: Section[] = Array.from({ length: nSectionsPerCourse }, (_, j) =>
      makeSection({
        id: `s${i}-${j}`,
        courseId: course.id,
        sectionNumber: `${j + 1}`,
        timeSlots: [makeTimeSlot(days[(i + j) % 5], `${9 + (j % 3)}:00`, `${9 + (j % 3)}:50`)],
      }),
    );
    sectionsByCourse.set(course.id, sections);
  });

  const prefs = {
    ...basePreferences,
    minCredits: 12,
    maxCredits: 24,
  };

  console.log(
    `Benchmarking generateSchedules with ${nCourses} courses, ${nSectionsPerCourse} sections each...`,
  );

  // Warmup
  generateSchedules(courses, sectionsByCourse, prefs, { maxSchedules: 1000 });

  const start = performance.now();
  const schedules = generateSchedules(courses, sectionsByCourse, prefs, { maxSchedules: 10000 });
  const end = performance.now();

  console.log(`Generated ${schedules.length} schedules in ${(end - start).toFixed(2)}ms`);
}

runBenchmark();
