import { Section, TimeSlot } from '../src/types';
import { hasSectionConflict } from '../src/utils/schedule';

function makeTimeSlot(day: any, start: string, end: string): TimeSlot {
  return { day, startTime: start, endTime: end };
}

function makeSection(id: string, slots: [any, string, string][]): Section {
  return {
    id,
    courseId: `c${id}`,
    sectionNumber: '001',
    instructor: 'Staff',
    timeSlots: slots.map((s) => makeTimeSlot(s[0], s[1], s[2])),
  };
}

const s1 = makeSection('1', [
  ['M', '09:00', '10:30'],
  ['W', '09:00', '10:30'],
]);
const s2 = makeSection('2', [
  ['M', '11:00', '12:30'],
  ['W', '11:00', '12:30'],
]);
const s3 = makeSection('3', [
  ['M', '10:00', '11:30'],
  ['W', '10:00', '11:30'],
]); // Conflicts with both

const iterations = 1000000;

// Warmup
for (let i = 0; i < 100000; i++) {
  hasSectionConflict(s1, s2);
  hasSectionConflict(s1, s3);
}

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  hasSectionConflict(s1, s2);
  hasSectionConflict(s1, s3);
}
const end = performance.now();

console.log(
  `hasSectionConflict: ${(((end - start) / (iterations * 2)) * 1000).toFixed(3)}ns average latency`,
);
