import { performance } from 'node:perf_hooks';
import {
  basePreferences,
  makeSchedule,
  makeSection,
  makeTimeSlot,
} from '../src/test/performance-helpers';
import {
  computeScheduleFeaturesWithContext,
  createScoringContext,
  hasTimeConflict,
  timeToMinutesCached,
} from '../src/utils/schedule';

function benchmark(name: string, fn: () => void, iterations: number = 1000000) {
  // Warmup
  for (let i = 0; i < 1000; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const duration = end - start;
  const opsPerSec = (iterations / duration) * 1000;
  console.log(
    `${name}: ${opsPerSec.toFixed(2)} ops/sec (${((duration / iterations) * 1000000).toFixed(2)} ns/op)`,
  );
}

console.log('--- Starting Bolt Performance Benchmark ---');

// 1. timeToMinutesCached
const times = ['08:00', '09:30', '12:00', '14:45', '17:00', '21:15'];
benchmark(
  'timeToMinutesCached',
  () => {
    for (const t of times) {
      timeToMinutesCached(t);
    }
  },
  100000,
);

// 2. hasTimeConflict
const slot1 = makeTimeSlot('M', '09:00', '10:30');
const slot2 = makeTimeSlot('M', '10:00', '11:30');
const slot3 = makeTimeSlot('T', '09:00', '10:30');
benchmark(
  'hasTimeConflict (overlap)',
  () => {
    hasTimeConflict(slot1, slot2);
  },
  1000000,
);
benchmark(
  'hasTimeConflict (no overlap)',
  () => {
    hasTimeConflict(slot1, slot3);
  },
  1000000,
);

// 3. computeScheduleFeaturesWithContext
const sections = [
  makeSection({
    id: 's1',
    timeSlots: [makeTimeSlot('M', '09:00', '10:30'), makeTimeSlot('W', '09:00', '10:30')],
  }),
  makeSection({
    id: 's2',
    timeSlots: [makeTimeSlot('T', '11:00', '12:30'), makeTimeSlot('Th', '11:00', '12:30')],
  }),
  makeSection({ id: 's3', timeSlots: [makeTimeSlot('F', '14:00', '15:30')] }),
  makeSection({
    id: 's4',
    timeSlots: [makeTimeSlot('M', '13:00', '14:30'), makeTimeSlot('W', '13:00', '14:30')],
  }),
];
const schedule = makeSchedule(sections, 12);
const context = createScoringContext(basePreferences);

benchmark(
  'computeScheduleFeaturesWithContext',
  () => {
    computeScheduleFeaturesWithContext(schedule, context);
  },
  100000,
);

console.log('--- Benchmark Complete ---');
