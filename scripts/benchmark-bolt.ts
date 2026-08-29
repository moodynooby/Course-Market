import { performance } from 'node:perf_hooks';
import {
  basePreferences,
  makeSchedule,
  makeSection,
  makeTimeSlot,
} from '../src/test/performance-helpers';
import { getScheduleFeatureVector } from '../src/utils/embeddings';
import {
  computeScheduleFeaturesWithContext,
  createScoringContext,
  hasSectionConflict,
  timeToMinutesCached,
} from '../src/utils/schedule';

const section1 = makeSection({
  timeSlots: [makeTimeSlot('M', '09:00', '10:30'), makeTimeSlot('W', '09:00', '10:30')],
});

const section2 = makeSection({
  timeSlots: [makeTimeSlot('M', '10:00', '11:30'), makeTimeSlot('W', '10:00', '11:30')],
});

const sections = [
  makeSection({ timeSlots: [makeTimeSlot('M', '08:00', '09:00')] }),
  makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:00')] }),
  makeSection({ timeSlots: [makeTimeSlot('T', '10:00', '11:00')] }),
  makeSection({ timeSlots: [makeTimeSlot('W', '11:00', '12:00')] }),
  makeSection({ timeSlots: [makeTimeSlot('Th', '12:00', '13:00')] }),
];
const schedule = makeSchedule(sections, 15);
const context = createScoringContext(basePreferences);

function benchmark(name: string, fn: () => void, iterations: number = 100000) {
  // Warmup
  for (let i = 0; i < 1000; i++) {
    fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  console.log(
    `${name}: ${(end - start).toFixed(4)}ms for ${iterations} iterations (${(((end - start) * 1000000) / iterations).toFixed(2)}ns per iteration)`,
  );
}

console.log('--- Performance Benchmark ---');
benchmark(
  'timeToMinutesCached (3 calls)',
  () => {
    timeToMinutesCached('09:00');
    timeToMinutesCached('10:30');
    timeToMinutesCached('14:00');
  },
  100000,
);

benchmark(
  'hasSectionConflict',
  () => {
    hasSectionConflict(section1, section2);
  },
  100000,
);

benchmark(
  'computeScheduleFeaturesWithContext',
  () => {
    computeScheduleFeaturesWithContext(schedule, context);
  },
  10000,
);

benchmark(
  'getScheduleFeatureVector (Cold)',
  () => {
    const s = makeSchedule(sections, 15); // New object each time to avoid cache
    getScheduleFeatureVector(s as any);
  },
  10000,
);

benchmark(
  'getScheduleFeatureVector (Hot/Cached)',
  () => {
    getScheduleFeatureVector(schedule as any); // Same object to hit cache
  },
  1000000,
);
