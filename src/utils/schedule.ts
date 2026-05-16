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

const DAY_ORDER: DayOfWeek[] = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
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
  const weekStart = getWeekStartDate();
  const refDate = referenceDate || weekStart;

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

export function calculateScheduleScore(schedule: Schedule, preferences: Preferences): number {
  let baseScore = 50;
  const { sections, totalCredits } = schedule;

  if (totalCredits > preferences.maxCredits) {
    baseScore -= 20;
  }
  if (totalCredits < preferences.minCredits) {
    baseScore -= 20;
  }

  const avoidDaysSet = new Set(preferences.avoidDays);
  const daysUsed = new Set<DayOfWeek>();
  let hasMorning = false;
  let hasAfternoon = false;
  let hasEvening = false;
  let outsideWindowCount = 0;

  const preferredStart = timeToMinutesCached(preferences.preferredStartTime);
  const preferredEnd = timeToMinutesCached(preferences.preferredEndTime);

  const allSlots: { day: DayOfWeek; start: number; end: number }[] = [];

  sections.forEach((section) => {
    section.timeSlots.forEach((slot) => {
      daysUsed.add(slot.day);
      const startTime = timeToMinutesCached(slot.startTime);
      const endTime = timeToMinutesCached(slot.endTime);

      allSlots.push({ day: slot.day, start: startTime, end: endTime });

      if (startTime < 720) hasMorning = true;
      else if (startTime < 1020) hasAfternoon = true;
      if (startTime >= 1020) hasEvening = true;

      if (startTime < preferredStart || endTime > preferredEnd) {
        outsideWindowCount++;
      }
    });
  });

  if (outsideWindowCount > 0) {
    baseScore -= Math.min(outsideWindowCount * 8, 20);
  }

  if (preferences.preferMorning && !hasMorning) {
    baseScore -= 10;
  }
  if (preferences.preferAfternoon && !hasAfternoon) {
    baseScore -= 10;
  }
  if (preferences.preferNoEvening && hasEvening) {
    baseScore -= 10;
  }

  daysUsed.forEach((day) => {
    if (avoidDaysSet.has(day)) {
      baseScore -= 15;
    }
  });

  if (preferences.preferConsecutiveDays && daysUsed.size > 1) {
    const sortedDays = Array.from(daysUsed).sort(
      (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
    );

    let gaps = 0;
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const currentIdx = DAY_ORDER.indexOf(sortedDays[i]);
      const nextIdx = DAY_ORDER.indexOf(sortedDays[i + 1]);
      if (currentIdx === 4 && nextIdx === 0) continue;
      if (nextIdx - currentIdx > 1) {
        gaps++;
      }
    }

    baseScore -= gaps * 5;
  }

  if (preferences.maxGapMinutes > 0 && allSlots.length > 1) {
    allSlots.sort((a, b) => {
      if (a.day !== b.day) {
        return DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
      }
      return a.start - b.start;
    });

    for (let i = 0; i < allSlots.length - 1; i++) {
      if (allSlots[i].day === allSlots[i + 1].day) {
        const gapMinutes = allSlots[i + 1].start - allSlots[i].end;
        if (gapMinutes > preferences.maxGapMinutes) {
          const excess = gapMinutes - preferences.maxGapMinutes;
          baseScore -= Math.round((excess / 60) * 5);
        }
      }
    }
  }

  if (daysUsed.size <= 3) {
    baseScore += 10;
  }

  let hasLunchBreak = false;
  for (const slot of allSlots) {
    if (slot.end <= 720) {
      for (const other of allSlots) {
        if (other.day === slot.day && other.start >= 780) {
          hasLunchBreak = true;
          break;
        }
      }
    }
    if (hasLunchBreak) break;
  }
  if (hasLunchBreak) {
    baseScore += 5;
  }

  if (outsideWindowCount === 0 && sections.length > 0) {
    baseScore += 10;
  }

  const creditTarget = preferences.maxCredits;
  if (totalCredits >= creditTarget - 2 && totalCredits <= creditTarget) {
    baseScore += 5;
  }

  return Math.max(0, Math.min(100, baseScore));
}
