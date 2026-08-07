import { basePreferences, makeSection, makeTimeSlot } from '../src/test/performance-helpers';
import {
  computeScheduleFeaturesWithContext,
  createScoringContext,
  hasSectionConflict,
  timeToMinutesCached,
} from '../src/utils/schedule';

const sections = Array.from({ length: 100 }, (_, i) =>
  makeSection({
    id: `s${i}`,
    timeSlots: [
      makeTimeSlot(i % 5 === 0 ? 'M' : 'W', '09:00', '10:30'),
      makeTimeSlot(i % 5 === 0 ? 'T' : 'Th', '13:00', '14:30'),
    ],
  }),
);

function benchmarkConflictDetection() {
  console.log('Benchmarking Conflict Detection...');
  const start = performance.now();
  let conflicts = 0;
  for (let i = 0; i < 1000; i++) {
    for (let j = 0; j < sections.length; j++) {
      for (let k = j + 1; k < sections.length; k++) {
        if (hasSectionConflict(sections[j], sections[k])) {
          conflicts++;
        }
      }
    }
  }
  const end = performance.now();
  console.log(`Conflict Detection: ${end - start}ms (found ${conflicts} conflicts)`);
}

function benchmarkFeatureCalculation() {
  console.log('Benchmarking Feature Calculation...');
  const context = createScoringContext(basePreferences);
  const schedule = {
    id: 's1',
    name: 'Test',
    sections: sections.slice(0, 5),
    totalCredits: 15,
    score: 0,
    conflicts: [],
  };

  const start = performance.now();
  for (let i = 0; i < 100000; i++) {
    computeScheduleFeaturesWithContext(schedule, context);
  }
  const end = performance.now();
  console.log(`Feature Calculation: ${end - start}ms`);
}

function benchmarkTimeParsing() {
  console.log('Benchmarking Time Parsing...');
  const times = [
    '08:00',
    '09:30',
    '10:00',
    '11:30',
    '12:00',
    '13:30',
    '14:00',
    '15:30',
    '16:00',
    '17:30',
  ];
  const start = performance.now();
  for (let i = 0; i < 1000000; i++) {
    timeToMinutesCached(times[i % times.length]);
  }
  const end = performance.now();
  console.log(`Time Parsing: ${end - start}ms`);
}

benchmarkConflictDetection();
benchmarkFeatureCalculation();
benchmarkTimeParsing();
