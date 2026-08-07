import { Preferences, Schedule, Section, TimeSlot } from '../src/types';
import { computeScheduleFeaturesWithContext, createScoringContext } from '../src/utils/schedule';

const basePreferences: Preferences = {
  minCredits: 12,
  maxCredits: 18,
  preferredStartTime: '08:00',
  preferredEndTime: '17:00',
  avoidDays: ['F'],
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: true,
  preferAfternoon: false,
  preferEvening: false,
};

function makeTimeSlot(day: any, start: string, end: string): TimeSlot {
  return { day, startTime: start, endTime: end };
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 's1',
    courseId: 'c1',
    sectionNumber: '001',
    instructor: 'Staff',
    timeSlots: [],
    ...overrides,
  };
}

function makeSchedule(sections: Section[], totalCredits: number): Schedule {
  return {
    id: 'sch1',
    name: 'Test Schedule',
    sections,
    totalCredits,
    score: 0,
    conflicts: [],
  };
}

const sections = [
  makeSection({
    courseId: 'c1',
    timeSlots: [makeTimeSlot('M', '09:00', '10:30'), makeTimeSlot('W', '09:00', '10:30')],
  }),
  makeSection({
    courseId: 'c2',
    timeSlots: [makeTimeSlot('M', '11:00', '12:30'), makeTimeSlot('W', '11:00', '12:30')],
  }),
  makeSection({
    courseId: 'c3',
    timeSlots: [makeTimeSlot('T', '09:00', '12:00'), makeTimeSlot('Th', '09:00', '12:00')],
  }),
  makeSection({
    courseId: 'c4',
    timeSlots: [makeTimeSlot('T', '14:00', '15:30'), makeTimeSlot('Th', '14:00', '15:30')],
  }),
  makeSection({ courseId: 'c5', timeSlots: [makeTimeSlot('M', '14:00', '17:00')] }),
];

const schedule = makeSchedule(sections, 15);
const context = createScoringContext(basePreferences);

const iterations = 100000;

// Warmup
for (let i = 0; i < 10000; i++) {
  computeScheduleFeaturesWithContext(schedule, context);
}

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  computeScheduleFeaturesWithContext(schedule, context);
}
const end = performance.now();

console.log(
  `computeScheduleFeaturesWithContext: ${(((end - start) / iterations) * 1000).toFixed(3)}us average latency`,
);
