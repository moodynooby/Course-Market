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
  M: 1,
  T: 2,
  W: 3,
  Th: 4,
  F: 5,
  Sa: 6,
  Su: 0,
};

function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function sectionsToCalendarEvents(sections: Section[], courses: Course[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const weekStart = getWeekStartDate();

  sections.forEach((section) => {
    const course = courses.find((c) => c.id === section.courseId);

    section.timeSlots.forEach((slot, index) => {
      const dayOffset = DAY_TO_NUMBER[slot.day];
      const startMinutes = timeToMinutes(slot.startTime);
      const endMinutes = timeToMinutes(slot.endTime);

      const startDate = new Date(weekStart);
      startDate.setDate(startDate.getDate() + dayOffset);
      startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + dayOffset);
      endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      // Add index to ensure unique IDs even when time slots are duplicated
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

/**
 * Formats time slots into a display string (e.g., "MWF 9:00 AM - 10:00 AM")
 * Optimized to avoid recalculating on every render.
 */
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

export function hasTimeConflict(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day !== slot2.day) return false;
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  return start1 < end2 && start2 < end1;
}

export function calculateScheduleScore(schedule: Schedule, preferences: Preferences): number {
  let score = 100;
  const { sections, totalCredits } = schedule;

  if (totalCredits > preferences.maxCredits) {
    score -= 20;
  }
  if (totalCredits < preferences.minCredits) {
    score -= 20;
  }

  const daySchedule = new Map<DayOfWeek, number[]>();

  sections.forEach((section) => {
    section.timeSlots.forEach((slot) => {
      const times = daySchedule.get(slot.day) || [];
      times.push(parseInt(slot.startTime.replace(':', ''), 10));
      times.push(parseInt(slot.endTime.replace(':', ''), 10));
      daySchedule.set(slot.day, times);
    });
  });

  daySchedule.forEach((_times, day) => {
    if (preferences.avoidDays.includes(day)) {
      score -= 15;
    }
  });

  const preferredStart = timeToMinutes(preferences.preferredStartTime);
  const preferredEnd = timeToMinutes(preferences.preferredEndTime);

  sections.forEach((section) => {
    section.timeSlots.forEach((slot) => {
      const startTime = timeToMinutes(slot.startTime);
      const endTime = timeToMinutes(slot.endTime);

      if (preferences.preferMorning && startTime < 720 && startTime >= 480) {
        score += 5;
      }
      if (preferences.preferAfternoon && startTime >= 720 && startTime < 1020) {
        score += 5;
      }
      if (startTime < preferredStart || endTime > preferredEnd) {
        score -= 10;
      }

      if (preferences.excludeInstructors.includes(section.instructor)) {
        score -= 20;
      }
    });
  });

  if (preferences.preferConsecutiveDays) {
    const days = new Set<DayOfWeek>();
    sections.forEach((section) => {
      section.timeSlots.forEach((slot) => days.add(slot.day));
    });

    const dayOrder: DayOfWeek[] = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];
    const sortedDays = Array.from(days).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    let gaps = 0;
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const currentIdx = dayOrder.indexOf(sortedDays[i]);
      const nextIdx = dayOrder.indexOf(sortedDays[i + 1]);
      if (nextIdx - currentIdx > 1) {
        gaps++;
      }
    }

    score -= gaps * 5;
  }

  if (preferences.maxGapMinutes > 0) {
    const allSlots: { day: DayOfWeek; start: number; end: number }[] = [];

    sections.forEach((section) => {
      section.timeSlots.forEach((slot) => {
        allSlots.push({
          day: slot.day,
          start: timeToMinutes(slot.startTime),
          end: timeToMinutes(slot.endTime),
        });
      });
    });

    allSlots.sort((a, b) => {
      if (a.day !== b.day) return a.day.localeCompare(b.day);
      return a.start - b.start;
    });

    for (let i = 0; i < allSlots.length - 1; i++) {
      if (allSlots[i].day === allSlots[i + 1].day) {
        const gapMinutes = allSlots[i + 1].start - allSlots[i].end;
        if (gapMinutes > preferences.maxGapMinutes) {
          score -= Math.floor(gapMinutes / 30) * 3;
        }
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}
