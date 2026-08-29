import {
  hasTimeConflict,
  computeScheduleFeaturesWithContext,
  createScoringContext
} from '../src/utils/schedule';
import { getScheduleFeatureVector } from '../src/utils/embeddings';
import { makeSection, makeTimeSlot, basePreferences, makeSchedule } from '../src/test/performance-helpers';
import type { GeneratedSchedule } from '../src/utils/schedule-types';

const ITERATIONS = 100000;

function benchmark() {
  console.log(`Running benchmarks with ${ITERATIONS.toLocaleString()} iterations...\n`);

  // 1. hasTimeConflict
  const slot1 = makeTimeSlot('M', '09:00', '10:30');
  const slot2 = makeTimeSlot('M', '10:00', '11:30');

  const start1 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    hasTimeConflict(slot1, slot2);
  }
  const end1 = performance.now();
  console.log(`hasTimeConflict: ${((end1 - start1) * 1e6 / ITERATIONS).toFixed(2)} ns/op`);

  // 2. computeScheduleFeaturesWithContext
  const sections = [
    makeSection({ timeSlots: [makeTimeSlot('M', '09:00', '10:30'), makeTimeSlot('W', '09:00', '10:30')] }),
    makeSection({ timeSlots: [makeTimeSlot('T', '10:00', '11:30'), makeTimeSlot('Th', '10:00', '11:30')] }),
    makeSection({ timeSlots: [makeTimeSlot('M', '13:00', '14:30'), makeTimeSlot('W', '13:00', '14:30')] }),
    makeSection({ timeSlots: [makeTimeSlot('F', '09:00', '12:00')] }),
  ];
  const schedule = makeSchedule(sections, 15);
  const context = createScoringContext(basePreferences);

  const start2 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    computeScheduleFeaturesWithContext(schedule, context);
  }
  const end2 = performance.now();
  console.log(`computeScheduleFeaturesWithContext: ${((end2 - start2) * 1e3 / ITERATIONS).toFixed(2)} µs/op`);

  // 3. getScheduleFeatureVector
  const genSchedule: GeneratedSchedule = {
    ...schedule,
    conflicts: []
  };

  const start3 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    getScheduleFeatureVector(genSchedule);
  }
  const end3 = performance.now();
  console.log(`getScheduleFeatureVector: ${((end3 - start3) * 1e3 / ITERATIONS).toFixed(2)} µs/op`);
}

benchmark();
