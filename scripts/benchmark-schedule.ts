import {
  basePreferences,
  makeSchedule,
  makeSection,
  makeTimeSlot,
} from '../src/test/performance-helpers';
import type { Section, TimeSlot } from '../src/types';
import {
  computeScheduleFeaturesWithContext,
  createScoringContext,
  hasTimeConflict,
  timeToMinutesCached,
} from '../src/utils/schedule';

function benchmark(name: string, fn: () => void, iterations: number = 100000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const total = end - start;
  const avg = (total * 1000000) / iterations; // ns
  console.log(`${name}: ${total.toFixed(2)}ms total, ${avg.toFixed(2)}ns avg`);
}

const times = ['08:00', '09:30', '12:00', '14:15', '17:00', '21:45'];

console.log('--- Benchmarking Schedule Utilities ---');

benchmark(
  'timeToMinutesCached (hit)',
  () => {
    for (const t of times) {
      timeToMinutesCached(t);
    }
  },
  100000,
);

const slot1: TimeSlot = makeTimeSlot('M', '09:00', '10:30');
const slot2: TimeSlot = makeTimeSlot('M', '10:00', '11:30');
const slot3: TimeSlot = makeTimeSlot('T', '09:00', '10:30');

benchmark(
  'hasTimeConflict',
  () => {
    hasTimeConflict(slot1, slot2);
    hasTimeConflict(slot1, slot3);
  },
  100000,
);

const sections: Section[] = [
  makeSection({
    timeSlots: [makeTimeSlot('M', '09:00', '10:30'), makeTimeSlot('W', '09:00', '10:30')],
  }),
  makeSection({
    timeSlots: [makeTimeSlot('T', '10:00', '11:30'), makeTimeSlot('Th', '10:00', '11:30')],
  }),
  makeSection({ timeSlots: [makeTimeSlot('F', '13:00', '14:30')] }),
];
const schedule = makeSchedule(sections, 12);
const context = createScoringContext(basePreferences);

benchmark(
  'computeScheduleFeaturesWithContext',
  () => {
    computeScheduleFeaturesWithContext(schedule, context);
  },
  10000,
);
