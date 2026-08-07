import { makeSchedule, makeSection, makeTimeSlot } from '../src/test/performance-helpers';
import { DayOfWeek, Preferences } from '../src/types';
import { computeScheduleFeaturesWithContext, createScoringContext } from '../src/utils/schedule';

const basePreferences: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: true,
  preferAfternoon: true,
  preferEvening: false,
  maxCredits: 18,
  minCredits: 12,
  avoidDays: ['Sa', 'Su'] as DayOfWeek[],
};

const days: DayOfWeek[] = ['M', 'T', 'W', 'Th', 'F'];
const sections = Array.from({ length: 6 }, (_, i) =>
  makeSection({
    id: `s${i}`,
    courseId: `c${i}`,
    timeSlots: [
      makeTimeSlot(days[i % 5], `${9 + (i % 3)}:00`, `${10 + (i % 3)}:30`),
      makeTimeSlot(days[(i + 1) % 5], `${11 + (i % 3)}:00`, `${12 + (i % 3)}:30`),
    ],
    instructor: `Dr. ${i}`,
  }),
);

const schedule = makeSchedule(sections, 18);
const context = createScoringContext(basePreferences);

const ITERATIONS = 100_000;

console.log(`Running benchmark for ${ITERATIONS} iterations...`);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  computeScheduleFeaturesWithContext(schedule, context);
}
const end = performance.now();
const duration = end - start;
console.log(`Total duration: ${duration.toFixed(2)}ms`);
console.log(`Average time per call: ${((duration / ITERATIONS) * 1000).toFixed(2)}µs`);
