import { Preferences, Schedule, Section, TimeSlot } from '../src/types';
import {
  computeScheduleFeaturesWithContext,
  createScoringContext,
  hasSectionConflict,
} from '../src/utils/schedule';

const makeTimeSlot = (day: any, startTime: string, endTime: string): TimeSlot => ({
  day,
  startTime,
  endTime,
});

const makeSection = (id: string, timeSlots: TimeSlot[]): Section => ({
  id,
  courseId: 'c1',
  sectionNumber: '001',
  instructor: 'Instructor',
  timeSlots,
  capacity: 30,
  enrolled: 20,
});

const s1 = makeSection('s1', [
  makeTimeSlot('M', '09:00', '10:15'),
  makeTimeSlot('W', '09:00', '10:15'),
]);

const s2 = makeSection('s2', [
  makeTimeSlot('T', '09:00', '10:15'),
  makeTimeSlot('Th', '09:00', '10:15'),
]);

const s3 = makeSection('s3', [
  makeTimeSlot('M', '10:30', '11:45'),
  makeTimeSlot('W', '10:30', '11:45'),
]);

const sections = [s1, s2, s3];
const schedule: Schedule = {
  id: 'sch1',
  name: 'Schedule 1',
  sections,
  totalCredits: 9,
  score: 0,
  conflicts: [],
};

const prefs: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: true,
  preferAfternoon: false,
  preferEvening: false,
  maxCredits: 18,
  minCredits: 12,
  avoidDays: ['F', 'Sa', 'Su'] as any,
};

const context = createScoringContext(prefs);

function benchmark() {
  const iterations = 100000;

  console.log(`Running benchmarks with ${iterations} iterations...`);

  // Warm up
  for (let i = 0; i < 1000; i++) {
    hasSectionConflict(s1, s2);
    hasSectionConflict(s1, s3);
    computeScheduleFeaturesWithContext(schedule, context);
  }

  const start1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    hasSectionConflict(s1, s2); // No conflict
    hasSectionConflict(s1, s3); // No conflict
  }
  const end1 = performance.now();
  console.log(
    `hasSectionConflict (no conflict): ${(((end1 - start1) * 1000000) / (iterations * 2)).toFixed(2)} ns/op`,
  );

  const start2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    computeScheduleFeaturesWithContext(schedule, context);
  }
  const end2 = performance.now();
  console.log(
    `computeScheduleFeaturesWithContext: ${(((end2 - start2) * 1000000) / iterations).toFixed(2)} ns/op`,
  );
}

benchmark();
