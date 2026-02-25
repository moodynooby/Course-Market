import type { Course, Section, Schedule, TimeSlot, DayOfWeek, Preferences } from '../types';

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

  const start1 = parseInt(slot1.startTime.replace(':', ''), 10);
  const end1 = parseInt(slot1.endTime.replace(':', ''), 10);
  const start2 = parseInt(slot2.startTime.replace(':', ''), 10);
  const end2 = parseInt(slot2.endTime.replace(':', ''), 10);

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

  const preferredStart = parseInt(preferences.preferredStartTime.replace(':', ''), 10);
  const preferredEnd = parseInt(preferences.preferredEndTime.replace(':', ''), 10);

  sections.forEach((section) => {
    section.timeSlots.forEach((slot) => {
      const startTime = parseInt(slot.startTime.replace(':', ''), 10);
      const endTime = parseInt(slot.endTime.replace(':', ''), 10);

      if (preferences.preferMorning && startTime < 1200 && startTime >= 800) {
        score += 5;
      }
      if (preferences.preferAfternoon && startTime >= 1200 && startTime < 1700) {
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
          start: parseInt(slot.startTime.replace(':', ''), 10),
          end: parseInt(slot.endTime.replace(':', ''), 10),
        });
      });
    });

    allSlots.sort((a, b) => {
      if (a.day !== b.day) return a.day.localeCompare(b.day);
      return a.start - b.start;
    });

    for (let i = 0; i < allSlots.length - 1; i++) {
      if (allSlots[i].day === allSlots[i + 1].day) {
        const gapMinutes = ((allSlots[i + 1].start - allSlots[i].end) * 60) / 100;
        if (gapMinutes > preferences.maxGapMinutes) {
          score -= Math.floor(gapMinutes / 30) * 3;
        }
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}
