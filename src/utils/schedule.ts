import type { Course, Section, Schedule, TimeSlot, DayOfWeek, Preferences } from '../types';
import { generateId } from './id';

export function hasTimeConflict(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day !== slot2.day) return false;

  const start1 = parseInt(slot1.startTime.replace(':', ''), 10);
  const end1 = parseInt(slot1.endTime.replace(':', ''), 10);
  const start2 = parseInt(slot2.startTime.replace(':', ''), 10);
  const end2 = parseInt(slot2.endTime.replace(':', ''), 10);

  return start1 < end2 && start2 < end1;
}

export function checkSectionConflicts(sections: Section[]): string[] {
  const conflicts: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const section1 = sections[i];
      const section2 = sections[j];

      for (const slot1 of section1.timeSlots) {
        for (const slot2 of section2.timeSlots) {
          if (hasTimeConflict(slot1, slot2)) {
            conflicts.push(`${section1.sectionNumber} and ${section2.sectionNumber} conflict`);
          }
        }
      }
    }
  }

  return conflicts;
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

export function generateAllSchedules(
  courses: Course[],
  sections: Section[],
  selectedSections: Map<string, string>,
  preferences: Preferences,
): Schedule[] {
  const schedules: Schedule[] = [];

  const coursesWithSections = courses.filter((course) => {
    const sectionId = selectedSections.get(course.id);
    return sectionId && sections.find((s) => s.id === sectionId);
  });

  if (coursesWithSections.length === 0) {
    return schedules;
  }

  function generateCombinations(index: number, currentSections: Section[]): void {
    if (index >= coursesWithSections.length) {
      const conflicts = checkSectionConflicts(currentSections);
      const totalCredits = currentSections.reduce((sum, s) => {
        const course = courses.find((c) => c.id === s.courseId);
        return sum + (course?.credits || 3);
      }, 0);

      const schedule: Schedule = {
        id: generateId(),
        name: `Schedule ${schedules.length + 1}`,
        sections: [...currentSections],
        totalCredits,
        score: 0,
        conflicts,
      };

      schedule.score = calculateScheduleScore(schedule, preferences);
      schedules.push(schedule);
      return;
    }

    const course = coursesWithSections[index];
    const courseSections = sections.filter((s) => s.courseId === course.id);
    const selectedSectionId = selectedSections.get(course.id);

    if (selectedSectionId) {
      const selectedSection = courseSections.find((s) => s.id === selectedSectionId);
      if (selectedSection) {
        const hasConflict = currentSections.some((current) =>
          current.timeSlots.some((slot1) =>
            selectedSection.timeSlots.some((slot2) => hasTimeConflict(slot1, slot2)),
          ),
        );

        if (!hasConflict) {
          generateCombinations(index + 1, [...currentSections, selectedSection]);
        }
      }
    } else {
      for (const section of courseSections) {
        const hasConflict = currentSections.some((current) =>
          current.timeSlots.some((slot1) =>
            section.timeSlots.some((slot2) => hasTimeConflict(slot1, slot2)),
          ),
        );

        if (!hasConflict) {
          generateCombinations(index + 1, [...currentSections, section]);
        }
      }
    }
  }

  generateCombinations(0, []);

  schedules.sort((a, b) => b.score - a.score);

  return schedules;
}

export function getBestSchedule(schedules: Schedule[]): Schedule | null {
  if (schedules.length === 0) return null;
  return schedules[0];
}
