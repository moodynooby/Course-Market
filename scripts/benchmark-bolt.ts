
import { Section, TimeSlot, Preferences } from '../src/types';
import { hasSectionConflict, computeScheduleFeaturesWithContext, createScoringContext } from '../src/utils/schedule';

const dayToNumber: Record<string, number> = { M: 0, T: 1, W: 2, Th: 3, F: 4, Sa: 5, Su: 6 };

function makeTimeSlot(day: string, start: string, end: string): TimeSlot {
  return { day: day as any, startTime: start, endTime: end };
}

function makeSection(id: string, slots: TimeSlot[]): Section {
  return {
    id,
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Prof',
    timeSlots: slots,
  };
}

const sections: Section[] = [
  makeSection('s1', [makeTimeSlot('M', '09:00', '10:30'), makeTimeSlot('W', '09:00', '10:30')]),
  makeSection('s2', [makeTimeSlot('M', '11:00', '12:30'), makeTimeSlot('W', '11:00', '12:30')]),
  makeSection('s3', [makeTimeSlot('T', '09:00', '10:30'), makeTimeSlot('Th', '09:00', '10:30')]),
  makeSection('s4', [makeTimeSlot('T', '11:00', '12:30'), makeTimeSlot('Th', '11:00', '12:30')]),
  makeSection('s5', [makeTimeSlot('F', '09:00', '12:00')]),
];

const prefs: Preferences = {
  minCredits: 12,
  maxCredits: 18,
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  avoidDays: [],
  preferMorning: true,
  preferAfternoon: false,
  preferEvening: false,
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
};

const context = createScoringContext(prefs);
const schedule = {
  id: 'test',
  name: 'test',
  sections,
  totalCredits: 15,
  score: 0,
  conflicts: [],
};

const ITERATIONS = 100_000;

console.log(`Running benchmarks with ${ITERATIONS} iterations...`);

// Benchmark hasSectionConflict
let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  hasSectionConflict(sections[0], sections[1]);
  hasSectionConflict(sections[0], sections[2]);
}
let end = performance.now();
console.log(`hasSectionConflict: ${(end - start).toFixed(2)}ms (${((end - start) * 1000 / (ITERATIONS * 2)).toFixed(2)}ns/op)`);

// Benchmark computeScheduleFeaturesWithContext
start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  computeScheduleFeaturesWithContext(schedule, context);
}
end = performance.now();
console.log(`computeScheduleFeaturesWithContext: ${(end - start).toFixed(2)}ms (${((end - start) * 1000 / ITERATIONS).toFixed(2)}ns/op)`);
