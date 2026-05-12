import { generateSchedules } from '../utils/schedule-generator';
import { Course, Section, Preferences } from '../types';
import { searchSchedules, buildCourseIndex } from '../services/search';

const mockCourses: Course[] = Array.from({ length: 5 }, (_, i) => ({
  id: `c${i}`,
  code: `CS${100 + i}`,
  name: `Course ${i}`,
  credits: 3,
  description: `Description ${i}`,
  subject: 'CS',
}));

const mockSectionsByCourse = new Map<string, Section[]>();
mockCourses.forEach((c, cIdx) => {
  const sections: Section[] = Array.from({ length: 3 }, (_, i) => ({
    id: `${c.id}-s${i}`,
    courseId: c.id,
    sectionNumber: `${i + 1}`,
    instructor: `Professor ${cIdx}-${i}`,
    timeSlots: [
      {
        day: ['M', 'T', 'W', 'Th', 'F'][cIdx % 5] as any,
        startTime: `${8 + i}:00`,
        endTime: `${9 + i}:00`,
      },
    ],
    capacity: 30,
    enrolled: 0,
  }));
  mockSectionsByCourse.set(c.id, sections);
});

const prefs: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: false,
  preferAfternoon: false,
  maxCredits: 24,
  minCredits: 3,
  avoidDays: [],
  excludeInstructors: [],
};

function benchmark() {
  console.log('--- Schedule Generation Benchmark ---');
  const startGen = performance.now();
  const schedules = generateSchedules(mockCourses, mockSectionsByCourse, prefs, {
    maxSchedules: 1000,
  });
  const endGen = performance.now();
  console.log(`Generated ${schedules.length} schedules in ${(endGen - startGen).toFixed(2)}ms`);

  if (schedules.length > 0) {
    buildCourseIndex(mockCourses, []);
    console.log('\n--- Search Schedules Benchmark (Initial Search) ---');
    const startSearch1 = performance.now();
    searchSchedules(schedules, 'Professor');
    const endSearch1 = performance.now();
    console.log(`First search took ${(endSearch1 - startSearch1).toFixed(2)}ms`);

    console.log('\n--- Search Schedules Benchmark (Repeated Search) ---');
    const startSearch2 = performance.now();
    for (let i = 0; i < 10; i++) {
      searchSchedules(schedules, 'Professor');
    }
    const endSearch2 = performance.now();
    console.log(
      `10 repeated searches took ${(endSearch2 - startSearch2).toFixed(2)}ms (avg: ${((endSearch2 - startSearch2) / 10).toFixed(2)}ms)`,
    );
  }
}

benchmark();
