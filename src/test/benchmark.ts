import { generateSchedules } from '../utils/schedule-generator';
import { basePreferences, makeSection, makeTimeSlot } from './performance-helpers';
import type { Course, Section } from '../types';

function runBenchmark() {
  const numCourses = 10;
  const sectionsPerCourse = 6;

  const courses: Course[] = Array.from({ length: numCourses }, (_, i) => ({
    id: `c${i}`,
    code: `CS${i}`,
    name: `Course ${i}`,
    credits: 3,
    description: '',
    department: 'CS',
  }));

  const sectionsByCourse = new Map<string, Section[]>();
  courses.forEach((course, i) => {
    const sections: Section[] = Array.from({ length: sectionsPerCourse }, (_, j) =>
      makeSection({
        id: `s${i}-${j}`,
        courseId: course.id,
        sectionNumber: `${j + 1}`,
        timeSlots: [
          makeTimeSlot(
            ['M', 'T', 'W', 'Th', 'F'][i % 5] as any,
            `${8 + (j % 8)}:00`,
            `${9 + (j % 8)}:00`,
          ),
        ],
      }),
    );
    sectionsByCourse.set(course.id, sections);
  });

  console.log(`Running benchmark with ${numCourses} courses and ${sectionsPerCourse} sections...`);
  const iterations = 5;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    generateSchedules(courses, sectionsByCourse, basePreferences, { maxSchedules: 1000 });
  }

  const end = performance.now();
  console.log(`Average execution time: ${((end - start) / iterations).toFixed(2)}ms`);
}

runBenchmark();
