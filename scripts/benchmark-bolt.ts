import { basePreferences, makeSection, makeTimeSlot } from '../src/test/performance-helpers';
import type { Course, DayOfWeek, Section } from '../src/types';
import { generateSchedules } from '../src/utils/schedule-generator';

const courses: Course[] = Array.from({ length: 8 }, (_, i) => ({
  id: `c${i}`,
  code: `CS${100 + i}`,
  name: `Course ${i}`,
  subject: 'CS',
  credits: 3,
}));

const sectionsByCourse = new Map<string, Section[]>();
const days: DayOfWeek[] = ['M', 'T', 'W', 'Th', 'F'];

courses.forEach((c, cIdx) => {
  const sections: Section[] = Array.from({ length: 6 }, (_, i) =>
    makeSection({
      id: `${c.id}-s${i}`,
      courseId: c.id,
      sectionNumber: `00${i}`,
      timeSlots: [
        makeTimeSlot(days[(i + cIdx) % 5], `${8 + i}:00`, `${9 + i}:00`),
        makeTimeSlot(days[(i + cIdx + 2) % 5], `${8 + i}:00`, `${9 + i}:00`),
      ],
    }),
  );
  sectionsByCourse.set(c.id, sections);
});

console.log('Running benchmark...');
const iterations = 5;
const times: number[] = [];

for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  const results = generateSchedules(
    courses,
    sectionsByCourse,
    {
      ...basePreferences,
      minCredits: 12,
      maxCredits: 24,
    },
    { maxSchedules: 20000 },
  );
  const end = performance.now();
  times.push(end - start);
  console.log(`Iteration ${i + 1}: ${results.length} schedules in ${(end - start).toFixed(2)}ms`);
}

const avg = times.reduce((a, b) => a + b, 0) / iterations;
console.log(`Average time: ${avg.toFixed(2)}ms`);
