import { generateSchedules } from '../utils/schedule-generator';
import type { Course, Section, Preferences } from '../types';

const courses: Course[] = Array.from({ length: 6 }, (_, i) => ({
  id: `c${i}`,
  code: `CS${100 + i}`,
  name: `Course ${i}`,
  subject: 'CS',
  credits: 3,
}));

const sectionsByCourse = new Map<string, Section[]>();
courses.forEach((course) => {
  const sections: Section[] = Array.from({ length: 10 }, (_, i) => ({
    id: `${course.id}-s${i}`,
    courseId: course.id,
    sectionNumber: `00${i}`,
    instructor: `Prof ${i}`,
    capacity: 30,
    enrolled: 10,
    timeSlots: [
      {
        day: (['M', 'T', 'W', 'Th', 'F'] as const)[i % 5],
        startTime: `${8 + i}:00`,
        endTime: `${8 + i}:50`,
      },
    ],
  }));
  sectionsByCourse.set(course.id, sections);
});

const preferences: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: true,
  preferAfternoon: false,
  maxCredits: 24,
  minCredits: 12,
  avoidDays: ['F'],
  excludeInstructors: ['Prof 3'],
};

function benchmark(label: string) {
  const start = performance.now();
  const results = generateSchedules(courses, sectionsByCourse, preferences, {
    maxSchedules: 50000,
  });
  const end = performance.now();
  console.log(`[${label}] Generated ${results.length} schedules in ${(end - start).toFixed(2)}ms`);
}

console.log('Starting medium benchmark...');
// Warmup
generateSchedules(courses, sectionsByCourse, preferences, { maxSchedules: 100 });
benchmark('Run 1');
benchmark('Run 2');
benchmark('Run 3');
