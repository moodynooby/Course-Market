import type {
  CalendarEvent,
  Course,
  DayOfWeek,
  Preferences,
  Schedule,
  Section,
  TimeSlot,
} from '../types';

const DAY_TO_NUMBER: Record<DayOfWeek, number> = {
  M: 0,
  T: 1,
  W: 2,
  Th: 3,
  F: 4,
  Sa: 5,
  Su: 6,
};

export const DAY_ORDER: DayOfWeek[] = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

function getWeekStartDate(date: Date = new Date()): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function sectionsToCalendarEvents(
  sections: Section[],
  courses: Course[],
  referenceDate?: Date,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const refDate = referenceDate || new Date();
  const weekStart = getWeekStartDate(refDate);

  sections.forEach((section) => {
    const course = courses.find((c) => c.id === section.courseId);

    section.timeSlots.forEach((slot, index) => {
      if (!isSlotActiveDuring(slot, refDate)) return;

      const dayOffset = DAY_TO_NUMBER[slot.day];
      const startMinutes = timeToMinutesCached(slot.startTime);
      const endMinutes = timeToMinutesCached(slot.endTime);

      const startDate = new Date(weekStart);
      startDate.setDate(startDate.getDate() + dayOffset);
      startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + dayOffset);
      endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      events.push({
        id: `${section.id}-${slot.day}-${slot.startTime}-${index}`,
        title: `${course?.code || 'Course'} - ${section.sectionNumber}`,
        start: startDate,
        end: endDate,
        allDay: false,
        resource: { section, course },
      });
    });
  });

  return events;
}

export function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
}

export function formatTimeSlots(timeSlots: TimeSlot[]): {
  dayDisplay: string;
  timeDisplay: string;
} {
  if (timeSlots.length === 0) {
    return { dayDisplay: '', timeDisplay: 'TBA' };
  }

  const uniqueDays = new Set(timeSlots.map((slot) => slot.day));
  const dayDisplay = Array.from(uniqueDays).join('');

  const firstSlot = timeSlots[0];
  const timeDisplay = `${formatTime(firstSlot.startTime)} - ${formatTime(firstSlot.endTime)}`;

  return { dayDisplay, timeDisplay };
}

export function hasSectionConflict(section1: Section, section2: Section): boolean {
  for (const slot1 of section1.timeSlots) {
    for (const slot2 of section2.timeSlots) {
      if (hasTimeConflict(slot1, slot2)) {
        return true;
      }
    }
  }
  return false;
}

export function checkConflicts(sections: Section[]): string[] {
  const conflicts: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      if (hasSectionConflict(sections[i], sections[j])) {
        conflicts.push(`${sections[i].sectionNumber} and ${sections[j].sectionNumber} conflict`);
      }
    }
  }

  return conflicts;
}

const timeCache = new Map<string, number>();
const MAX_CACHE_SIZE = 100;
const cacheKeys: string[] = [];

export function timeToMinutesCached(time: string): number {
  let minutes = timeCache.get(time);
  if (minutes === undefined) {
    const [hours, mins] = time.split(':').map(Number);
    minutes = hours * 60 + mins;
    if (timeCache.size >= MAX_CACHE_SIZE) {
      const oldest = cacheKeys.shift();
      if (oldest) timeCache.delete(oldest);
    }
    timeCache.set(time, minutes);
    cacheKeys.push(time);
  }
  return minutes;
}

function dateRangesOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (!slot1.startDate || !slot1.endDate || !slot2.startDate || !slot2.endDate) {
    return true;
  }
  if (slot1.endDate < slot2.startDate) return false;
  if (slot2.endDate < slot1.startDate) return false;
  return true;
}

export function hasTimeConflict(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day !== slot2.day) return false;
  if (!dateRangesOverlap(slot1, slot2)) return false;
  const start1 = timeToMinutesCached(slot1.startTime);
  const end1 = timeToMinutesCached(slot1.endTime);
  const start2 = timeToMinutesCached(slot2.startTime);
  const end2 = timeToMinutesCached(slot2.endTime);
  return start1 < end2 && start2 < end1;
}

export function isSlotActiveDuring(slot: TimeSlot, referenceDate: Date): boolean {
  if (!slot.startDate || !slot.endDate) return true;
  const start = new Date(slot.startDate);
  const end = new Date(slot.endDate);
  return referenceDate >= start && referenceDate <= end;
}

export function filterSlotsByDate(timeSlots: TimeSlot[], referenceDate: Date): TimeSlot[] {
  return timeSlots.filter((slot) => isSlotActiveDuring(slot, referenceDate));
}

export function formatSlotDates(slot: TimeSlot): string {
  if (!slot.startDate || !slot.endDate) return '';
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  return `${formatDate(slot.startDate)} - ${formatDate(slot.endDate)}`;
}

export const COMPACT_DAY_THRESHOLD = 3;
const MORNING_END = 720;
const AFTERNOON_END = 1020;
const LUNCH_AFTER = 780;

export interface ScheduleFeatures {
  creditDelta: number;
  outsideWindowMinutes: number;
  avoidDayHits: number;
  prefMismatch: number;
  daysUsed: number;
  gapMinutesTotal: number;
  dayGapCount: number;
  hasLunchBreak: 0 | 1;
  fullyInsideWindow: 0 | 1;
}

export interface ScoringContext {
  avoidDaysSet: Set<DayOfWeek>;
  preferredStart: number;
  preferredEnd: number;
  creditTarget: number;
  preferences: Preferences;
}

export function createScoringContext(preferences: Preferences): ScoringContext {
  return {
    avoidDaysSet: new Set(preferences.avoidDays),
    preferredStart: timeToMinutesCached(preferences.preferredStartTime),
    preferredEnd: timeToMinutesCached(preferences.preferredEndTime),
    creditTarget: (preferences.minCredits + preferences.maxCredits) / 2,
    preferences,
  };
}

export function computeScheduleFeatures(
  schedule: Schedule,
  preferences: Preferences,
): ScheduleFeatures {
  return computeScheduleFeaturesWithContext(schedule, createScoringContext(preferences));
}

export function computeScheduleFeaturesWithContext(
  schedule: Schedule,
  context: ScoringContext,
): ScheduleFeatures {
  const { sections, totalCredits } = schedule;
  const { avoidDaysSet, preferredStart, preferredEnd, creditTarget, preferences } = context;

  let daysUsedMask = 0;
  let daysUsedCount = 0;
  let hasMorning = false;
  let hasAfternoon = false;
  let hasEvening = false;
  let outsideWindowMinutes = 0;
  let avoidDayHits = 0;

  const allSlots: { day: DayOfWeek; start: number; end: number }[] = [];

  for (const section of sections) {
    for (const slot of section.timeSlots) {
      const dayNum = DAY_TO_NUMBER[slot.day];
      if (!(daysUsedMask & (1 << dayNum))) {
        daysUsedMask |= 1 << dayNum;
        daysUsedCount++;
      }

      if (avoidDaysSet.has(slot.day)) avoidDayHits++;

      const start = timeToMinutesCached(slot.startTime);
      const end = timeToMinutesCached(slot.endTime);
      allSlots.push({ day: slot.day, start, end });

      if (start < MORNING_END) hasMorning = true;
      if (start >= MORNING_END && start < AFTERNOON_END) hasAfternoon = true;
      if (start >= AFTERNOON_END) hasEvening = true;

      if (start < preferredStart) outsideWindowMinutes += preferredStart - start;
      if (end > preferredEnd) outsideWindowMinutes += end - preferredEnd;
    }
  }

  let prefMismatch = 0;
  if (preferences.preferMorning && !hasMorning) prefMismatch++;
  if (preferences.preferAfternoon && !hasAfternoon) prefMismatch++;
  if (preferences.preferEvening && !hasEvening) prefMismatch++;

  let dayGapCount = 0;
  if (preferences.preferConsecutiveDays && daysUsedCount > 1) {
    let lastDayIdx = -1;
    for (let i = 0; i < 7; i++) {
      if (daysUsedMask & (1 << i)) {
        if (lastDayIdx !== -1 && i - lastDayIdx > 1) {
          dayGapCount++;
        }
        lastDayIdx = i;
      }
    }
  }

  let gapMinutesTotal = 0;
  let hasLunchBreak: 0 | 1 = 0;

  if (allSlots.length > 1) {
    // Sort by day order then start time
    allSlots.sort((a, b) => {
      const dayDiff = DAY_TO_NUMBER[a.day] - DAY_TO_NUMBER[b.day];
      return dayDiff !== 0 ? dayDiff : a.start - b.start;
    });

    const gapLimit = preferences.maxGapMinutes > 0 ? preferences.maxGapMinutes : 0;
    let currentDayEndsBeforeLunch = false;
    let currentDayStartsAfterLunch = false;
    let currentDay = allSlots[0].day;

    for (let i = 0; i < allSlots.length; i++) {
      const s = allSlots[i];

      // Day transition: check for lunch break in the previous day
      if (s.day !== currentDay) {
        if (hasLunchBreak === 0 && currentDayEndsBeforeLunch && currentDayStartsAfterLunch) {
          hasLunchBreak = 1;
        }
        currentDay = s.day;
        currentDayEndsBeforeLunch = false;
        currentDayStartsAfterLunch = false;
      }

      if (s.end <= MORNING_END) currentDayEndsBeforeLunch = true;
      if (s.start >= LUNCH_AFTER) currentDayStartsAfterLunch = true;

      // Gap calculation
      if (i < allSlots.length - 1 && allSlots[i + 1].day === s.day) {
        const gap = allSlots[i + 1].start - s.end;
        if (gap > gapLimit) gapMinutesTotal += gap - gapLimit;
      }
    }

    // Final check for the last day
    if (hasLunchBreak === 0 && currentDayEndsBeforeLunch && currentDayStartsAfterLunch) {
      hasLunchBreak = 1;
    }
  }

  const creditDelta = Math.abs(totalCredits - creditTarget);

  return {
    creditDelta,
    outsideWindowMinutes,
    avoidDayHits,
    prefMismatch,
    daysUsed: daysUsedCount,
    gapMinutesTotal,
    dayGapCount,
    hasLunchBreak,
    fullyInsideWindow: outsideWindowMinutes === 0 && sections.length > 0 ? 1 : 0,
  };
}

interface FeatureSpec {
  key: keyof ScheduleFeatures;
  weight: number;
  /** true = lower raw is better (cost); false = higher raw is better (benefit) */
  costLike: boolean;
}

function getFeatureSpecs(prefs: Preferences): FeatureSpec[] {
  return [
    { key: 'creditDelta', weight: 1.5, costLike: true },
    { key: 'outsideWindowMinutes', weight: 1.2, costLike: true },
    { key: 'avoidDayHits', weight: prefs.avoidDays.length > 0 ? 1.5 : 0, costLike: true },
    { key: 'prefMismatch', weight: 1.0, costLike: true },
    { key: 'daysUsed', weight: 0.6, costLike: true },
    { key: 'gapMinutesTotal', weight: prefs.maxGapMinutes > 0 ? 1.0 : 0, costLike: true },
    { key: 'dayGapCount', weight: prefs.preferConsecutiveDays ? 0.8 : 0, costLike: true },
    { key: 'hasLunchBreak', weight: 0.3, costLike: false },
    { key: 'fullyInsideWindow', weight: 0.5, costLike: false },
  ];
}

/**
 * Score schedules relatively against the candidate population.
 * Best schedule → 100, worst → 0. Identical features → all 100.
 * Preferences with no signal (e.g. empty avoidDays) drop out via weight=0.
 */
export function scoreSchedulesRelative(
  features: ScheduleFeatures[],
  preferences: Preferences,
): number[] {
  if (features.length === 0) return [];
  if (features.length === 1) return [100];

  const specs = getFeatureSpecs(preferences).filter((s) => s.weight > 0);
  if (specs.length === 0) return features.map(() => 100);

  const mins = new Map<keyof ScheduleFeatures, number>();
  const maxs = new Map<keyof ScheduleFeatures, number>();
  for (const spec of specs) {
    let min = Infinity;
    let max = -Infinity;
    for (const f of features) {
      const v = f[spec.key];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    mins.set(spec.key, min);
    maxs.set(spec.key, max);
  }

  const combined = features.map((f) => {
    let total = 0;
    let totalWeight = 0;
    for (const spec of specs) {
      const min = mins.get(spec.key)!;
      const max = maxs.get(spec.key)!;
      const range = max - min;
      let norm: number;
      if (range === 0) {
        norm = 1;
      } else {
        const raw = (f[spec.key] - min) / range;
        norm = spec.costLike ? 1 - raw : raw;
      }
      total += norm * spec.weight;
      totalWeight += spec.weight;
    }
    return total / totalWeight;
  });

  let cMin = Infinity;
  let cMax = -Infinity;
  for (const v of combined) {
    if (v < cMin) cMin = v;
    if (v > cMax) cMax = v;
  }
  if (cMax === cMin) return combined.map(() => 100);

  return combined.map((v) => Math.round(((v - cMin) / (cMax - cMin)) * 100));
}

/**
 * Back-compat absolute scorer (0-100). Used by embeddings.ts for a
 * schedule-intrinsic quality signal that stays stable across generation runs.
 * NOT used for ranking — use scoreSchedulesRelative for that.
 */
export function calculateAbsoluteScheduleScore(
  schedule: Schedule,
  preferences: Preferences,
): number {
  const f = computeScheduleFeatures(schedule, preferences);
  let s = 50;
  if (schedule.totalCredits > preferences.maxCredits) {
    s -= Math.min((schedule.totalCredits - preferences.maxCredits) * 5, 20);
  } else if (schedule.totalCredits < preferences.minCredits) {
    s -= Math.min((preferences.minCredits - schedule.totalCredits) * 5, 20);
  }
  s -= Math.min(f.outsideWindowMinutes / 30, 20);
  s -= Math.min(f.avoidDayHits * 5, 20);
  s -= f.prefMismatch * 10;
  s -= Math.min(f.gapMinutesTotal / 60, 10);
  s -= f.dayGapCount * 5;
  if (f.daysUsed <= COMPACT_DAY_THRESHOLD) s += 10;
  if (f.hasLunchBreak) s += 5;
  if (f.fullyInsideWindow) s += 10;
  return Math.max(0, Math.min(100, Math.round(s)));
}
