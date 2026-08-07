import type { Preferences, Schedule, Section, TimeSlot } from '../src/types';
import {
  computeScheduleFeaturesWithContext,
  createScoringContext,
  hasSectionConflict,
  timeToMinutesCached,
} from '../src/utils/schedule';

function createTimeSlot(day: any, start: string, end: string): TimeSlot {
  return { day, startTime: start, endTime: end };
}

const s1: Section = {
  id: 's1',
  courseId: 'c1',
  sectionNumber: '001',
  instructor: 'A',
  capacity: 30,
  enrolled: 0,
  timeSlots: [createTimeSlot('M', '09:00', '10:30'), createTimeSlot('W', '09:00', '10:30')],
};

const s2: Section = {
  id: 's2',
  courseId: 'c2',
  sectionNumber: '001',
  instructor: 'B',
  capacity: 30,
  enrolled: 0,
  timeSlots: [createTimeSlot('T', '09:00', '10:30'), createTimeSlot('Th', '09:00', '10:30')],
};

const s3: Section = {
  id: 's3',
  courseId: 'c3',
  sectionNumber: '001',
  instructor: 'C',
  capacity: 30,
  enrolled: 0,
  timeSlots: [createTimeSlot('M', '10:00', '11:30')],
};

const defaultPrefs: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: false,
  preferMorning: false,
  preferAfternoon: false,
  maxCredits: 18,
  minCredits: 12,
  avoidDays: [],
};

const schedule: Schedule = {
  id: 'test-sched',
  name: 'Test Schedule',
  sections: [s1, s2, s3],
  totalCredits: 9,
  score: 0,
  conflicts: [],
};

const context = createScoringContext(defaultPrefs);

function benchmark(name: string, fn: () => void, iterations: number = 1000000) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // ms
  console.log(
    `${name}: ${duration.toFixed(2)}ms (${(Number(end - start) / iterations).toFixed(2)}ns/op)`,
  );
}

console.log('--- Performance Benchmark ---');
benchmark(
  'timeToMinutesCached',
  () => {
    timeToMinutesCached('09:00');
    timeToMinutesCached('10:30');
    timeToMinutesCached('13:00');
    timeToMinutesCached('14:15');
  },
  1000000,
);

benchmark(
  'hasSectionConflict (no conflict)',
  () => {
    hasSectionConflict(s1, s2);
  },
  1000000,
);

benchmark(
  'hasSectionConflict (with conflict)',
  () => {
    hasSectionConflict(s1, s3);
  },
  1000000,
);

benchmark(
  'computeScheduleFeaturesWithContext',
  () => {
    computeScheduleFeaturesWithContext(schedule, context);
  },
  100000,
);
