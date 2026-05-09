import { generateSchedules } from '../utils/schedule-generator';
import { Course, Section, Preferences } from '../types';

const mockCourses: Course[] = Array.from({ length: 10 }, (_, i) => ({
  id: `c${i}`,
  code: `CS${100 + i}`,
  name: `Course ${i}`,
  subject: 'CS',
  credits: 3,
}));

const mockSectionsByCourse = new Map<string, Section[]>();
mockCourses.forEach((course) => {
  const sections: Section[] = Array.from({ length: 4 }, (_, j) => ({
    id: `${course.id}-s${j}`,
    courseId: course.id,
    sectionNumber: `00${j}`,
    instructor: `Professor ${j}`,
    timeSlots: [
      {
        day: ['M', 'T', 'W', 'Th', 'F'][Math.floor(Math.random() * 5)] as any,
        startTime: `${9 + (j % 8)}:00`,
        endTime: `${10 + (j % 8)}:00`,
      },
    ],
  }));
  mockSectionsByCourse.set(course.id, sections);
});

const preferences: Preferences = {
  minCredits: 12,
  maxCredits: 30,
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  preferMorning: true,
  preferAfternoon: false,
  avoidDays: ['F'],
  excludeInstructors: [],
  preferConsecutiveDays: true,
  maxGapMinutes: 60,
};

function runBenchmark() {
  console.log('Starting stress benchmark...');
  const iterations = 5;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const results = generateSchedules(mockCourses, mockSectionsByCourse, preferences, {
      maxSchedules: 50000,
    });
    const end = performance.now();
    times.push(end - start);
    console.log(`Iteration ${i+1}: Generated ${results.length} schedules in ${(end - start).toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / iterations;
  console.log(`Average time: ${avg.toFixed(2)}ms`);
}

runBenchmark();
