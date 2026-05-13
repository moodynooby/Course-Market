import type { Course, Section, SectionJSON } from '../types';

export function transformSections(sections: SectionJSON[]): {
  courses: Course[];
  sections: Section[];
} {
  const coursesMap = new Map<string, Course>();
  const resultSections: Section[] = [];
  const subjectsSet = new Set<string>();

  for (const section of sections) {
    if (!coursesMap.has(section.courseCode)) {
      coursesMap.set(section.courseCode, {
        id: section.courseCode,
        code: section.courseCode,
        name: section.courseName,
        subject: section.subject,
        credits: section.credits,
      });
    }

    resultSections.push({
      id: section.id,
      courseId: section.courseCode,
      sectionNumber: section.sectionNumber,
      instructor: section.instructor,
      timeSlots: section.timeSlots || [],
      capacity: section.capacity || 0,
      enrolled: section.enrolled || 0,
    });

    subjectsSet.add(section.subject);
  }

  return {
    courses: Array.from(coursesMap.values()),
    sections: resultSections,
  };
}
