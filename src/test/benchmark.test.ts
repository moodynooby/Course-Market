import { describe, it } from 'vitest';
import { generateSchedules } from '../utils/schedule-generator';
import { makeSection, makeTimeSlot, basePreferences } from './performance-helpers';
import type { Course, Section } from '../types';

describe('benchmark: schedule generation', () => {
  it('measures generation time for a realistic set of courses', () => {
    // 5 courses, each with 3 sections
    const courses: Course[] = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      code: `CS${100 + i}`,
      name: `Course ${i}`,
      subject: 'CS',
      credits: 3,
    }));

    const sectionsByCourse = new Map<string, Section[]>();
    courses.forEach((c, i) => {
      const sections = Array.from({ length: 3 }, (_, j) =>
        makeSection({
          id: `s${i}-${j}`,
          courseId: c.id,
          sectionNumber: `00${j}`,
          timeSlots: [
            makeTimeSlot(['M', 'T', 'W', 'Th', 'F'][i] as any, `${9 + j}:00`, `${10 + j}:00`),
          ],
        }),
      );
      sectionsByCourse.set(c.id, sections);
    });

    const start = performance.now();
    const results = generateSchedules(courses, sectionsByCourse, {
      ...basePreferences,
      minCredits: 12,
      maxCredits: 18,
    });
    const end = performance.now();

    console.log(`Generated ${results.length} schedules in ${(end - start).toFixed(2)}ms`);
  });

  it('measures generation time for a larger set of courses', () => {
    // 8 courses, each with 3 sections
    // 3^8 = 6561 combinations
    const courses: Course[] = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      code: `CS${100 + i}`,
      name: `Course ${i}`,
      subject: 'CS',
      credits: 3,
    }));

    const sectionsByCourse = new Map<string, Section[]>();
    courses.forEach((c, i) => {
      const sections = Array.from({ length: 3 }, (_, j) =>
        makeSection({
          id: `s${i}-${j}`,
          courseId: c.id,
          sectionNumber: `00${j}`,
          timeSlots: [
            makeTimeSlot(
              ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su', 'M'][i] as any,
              `${9 + Math.floor(j / 2)}:00`,
              `${10 + Math.floor(j / 2)}:00`,
            ),
          ],
        }),
      );
      sectionsByCourse.set(c.id, sections);
    });

    const start = performance.now();
    const results = generateSchedules(
      courses,
      sectionsByCourse,
      {
        ...basePreferences,
        minCredits: 12,
        maxCredits: 24, // Allow more credits to avoid pruning too much for now
      },
      { maxSchedules: 10000 },
    );
    const end = performance.now();

    console.log(
      `Generated ${results.length} schedules (larger set) in ${(end - start).toFixed(2)}ms`,
    );
  });
});
