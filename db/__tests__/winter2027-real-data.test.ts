import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Course, DayOfWeek, Preferences, Section } from '../../src/types';
import { checkConflicts, hasSectionConflict, isSlotActiveDuring } from '../../src/utils/schedule';
import { diagnoseEmptyGeneration } from '../../src/utils/schedule-diagnostics';
import { generateSchedules } from '../../src/utils/schedule-generator';
import { prefilterSections } from '../../src/utils/schedule-prefilter';

interface RawWinterSemesterJson {
  semesterId: string;
  semesterName: string;
  sections: Array<{
    id: string;
    courseCode: string;
    courseName: string;
    sectionNumber: string;
    instructor: string;
    credits: number;
    subject: string;
    capacity: number;
    enrolled: number;
    timeSlots: Array<{
      day: string;
      startTime: string;
      endTime: string;
      startDate?: string;
      endDate?: string;
    }>;
    description: string | null;
  }>;
}

const winterJsonPath = path.resolve(__dirname, '../../.import/semesters/Winter2027.json');

function loadWinter2027Data(): { courses: Course[]; sections: Section[] } {
  const content = fs.readFileSync(winterJsonPath, 'utf8');
  const raw: RawWinterSemesterJson = JSON.parse(content);

  const courseMap = new Map<string, Course>();
  const sections: Section[] = [];

  for (const rawSec of raw.sections) {
    if (!courseMap.has(rawSec.courseCode)) {
      courseMap.set(rawSec.courseCode, {
        id: rawSec.courseCode,
        code: rawSec.courseCode,
        name: rawSec.courseName,
        subject: rawSec.subject,
        credits: rawSec.credits,
        description: rawSec.description || undefined,
      });
    }

    sections.push({
      id: rawSec.id,
      courseId: rawSec.courseCode,
      sectionNumber: rawSec.sectionNumber,
      instructor: rawSec.instructor,
      capacity: rawSec.capacity,
      enrolled: rawSec.enrolled,
      timeSlots: rawSec.timeSlots.map((ts) => ({
        day: ts.day as DayOfWeek,
        startTime: ts.startTime,
        endTime: ts.endTime,
        startDate: ts.startDate,
        endDate: ts.endDate,
      })),
    });
  }

  return { courses: Array.from(courseMap.values()), sections };
}

describe('Winter 2027 Real Data Conflict & Scheduling Validation', () => {
  const { courses, sections } = loadWinter2027Data();
  const sectionsById = new Map(sections.map((s) => [s.id, s]));

  it('loaded 328 courses and 475 sections from Winter 2027 directory', () => {
    expect(courses.length).toBe(328);
    expect(sections.length).toBe(475);
  });

  describe('Part-of-Term Mini Courses (Date Range Awareness)', () => {
    it('does not flag conflict between DGT101 Sec 001 and Sec 002 despite identical days/times', () => {
      // DGT101-001 (Jan 4 to Feb 19, M/F 14:30-16:00)
      // DGT101-002 (Mar 1 to Apr 18, M/F 14:30-16:00)
      const sec1 = sectionsById.get('DGT101-001-winter2027');
      const sec2 = sectionsById.get('DGT101-002-winter2027');

      expect(sec1).toBeDefined();
      expect(sec2).toBeDefined();

      if (sec1 && sec2) {
        expect(hasSectionConflict(sec1, sec2)).toBe(false);
      }
    });

    it('preserves both DGT101 mini-course terms during section deduplication', () => {
      const dgtSections = sections.filter((s) => s.courseId === 'DGT101');
      const input = new Map([['DGT101', dgtSections]]);
      const courseCodes = new Map([['DGT101', 'DGT101']]);

      const prefs: Preferences = {
        preferredStartTime: '08:00',
        preferredEndTime: '20:00',
        maxGapMinutes: 60,
        preferConsecutiveDays: false,
        preferMorning: false,
        preferAfternoon: false,
        maxCredits: 18,
        minCredits: 12,
        avoidDays: [],
      };

      const report = prefilterSections(input, prefs, courseCodes);
      const filtered = report.sectionsByCourse.get('DGT101');

      // Sec 001 (Term 1 M/F), Sec 002 (Term 2 M/F), Sec 003 (Term 1 T/Th), Sec 004 (Term 2 T/Th)
      // None should be collapsed because their date ranges or day patterns differ
      expect(filtered).toHaveLength(4);
      expect(report.summary.dedupRemoved).toBe(0);
    });
  });

  describe('Real-World Conflict Detection', () => {
    it('detects genuine overlap on Monday 08:00 between COM101 Sec 001 and COM101 Sec 003', () => {
      // COM101-001 meets M, W 08:00-09:30
      // COM101-003 meets M, F 08:00-09:30
      const sec1 = sectionsById.get('COM101-001-winter2027');
      const sec3 = sectionsById.get('COM101-003-winter2027');

      expect(sec1).toBeDefined();
      expect(sec3).toBeDefined();

      if (sec1 && sec3) {
        expect(hasSectionConflict(sec1, sec3)).toBe(true);

        const conflicts = checkConflicts([sec1, sec3], courses);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]).toBe('COM101 Sec 001 and COM101 Sec 003 conflict');
      }
    });

    it('does not flag self-conflict for real Winter 2027 sections', () => {
      for (const section of sections.slice(0, 50)) {
        expect(hasSectionConflict(section, section)).toBe(false);
      }
    });

    it('isSlotActiveDuring correctly treats final semester date (2027-04-18) as active', () => {
      const sec1 = sectionsById.get('COM101-001-winter2027');
      expect(sec1).toBeDefined();

      if (sec1?.timeSlots[0]) {
        const slot = sec1.timeSlots[0];
        // At 14:00 on the last day of the semester
        const finalDay = new Date('2027-04-18T14:00:00');
        expect(isSlotActiveDuring(slot, finalDay)).toBe(true);

        // Day after the semester ends
        const postSemester = new Date('2027-04-19T09:00:00');
        expect(isSlotActiveDuring(slot, postSemester)).toBe(false);
      }
    });
  });

  describe('End-to-End Schedule Generation with Winter 2027 Courses', () => {
    it('generates non-conflicting schedules for a student choosing 4 Winter 2027 courses', () => {
      const selectedCodes = ['COM101', 'DES101', 'ECO100', 'ECO110'];
      const selectedCourses = courses.filter((c) => selectedCodes.includes(c.code));
      const sectionsByCourse = new Map<string, Section[]>();

      for (const course of selectedCourses) {
        const courseSecs = sections.filter((s) => s.courseId === course.id);
        sectionsByCourse.set(course.id, courseSecs);
      }

      const prefs: Preferences = {
        preferredStartTime: '08:00',
        preferredEndTime: '20:00',
        maxGapMinutes: 120,
        preferConsecutiveDays: false,
        preferMorning: false,
        preferAfternoon: false,
        maxCredits: 15,
        minCredits: 12,
        avoidDays: [],
      };

      const generated = generateSchedules(selectedCourses, sectionsByCourse, prefs, {
        maxSchedules: 50,
      });

      expect(generated.length).toBeGreaterThan(0);

      // Verify EVERY generated schedule has zero conflicts
      for (const sched of generated) {
        expect(sched.conflicts).toHaveLength(0);
        expect(checkConflicts(sched.sections, selectedCourses)).toHaveLength(0);
        // Verify no overlapping sections exist
        for (let i = 0; i < sched.sections.length; i++) {
          for (let j = i + 1; j < sched.sections.length; j++) {
            expect(hasSectionConflict(sched.sections[i], sched.sections[j])).toBe(false);
          }
        }
      }
    });

    it('diagnoses impossible combinations correctly with Winter 2027 data', () => {
      // Pick sections that specifically conflict:
      // DES101 Sec 001 (M/F 19:00-20:30) and DES102 Sec 001 (M/F 19:00-20:30)
      const des101Sec1 = sectionsById.get('DES101-001-winter2027');
      const des102Sec1 = sectionsById.get('DES102-001-winter2027');

      expect(des101Sec1).toBeDefined();
      expect(des102Sec1).toBeDefined();

      if (!des101Sec1 || !des102Sec1) return;

      expect(hasSectionConflict(des101Sec1, des102Sec1)).toBe(true);

      const impossibleSections = new Map<string, Section[]>([
        ['DES101', [des101Sec1]],
        ['DES102', [des102Sec1]],
      ]);
      const selectedCourses = courses.filter((c) => c.code === 'DES101' || c.code === 'DES102');

      const diagnostics = diagnoseEmptyGeneration(
        selectedCourses,
        impossibleSections,
        {
          preferredStartTime: '08:00',
          preferredEndTime: '20:00',
          maxGapMinutes: 60,
          preferConsecutiveDays: false,
          preferMorning: false,
          preferAfternoon: false,
          maxCredits: 6,
          minCredits: 6,
          avoidDays: [],
        },
        new Map(),
      );

      expect(diagnostics.hasIssues).toBe(true);
      expect(diagnostics.reasons.some((r) => r.type === 'all-conflicts')).toBe(true);
      const des101Diag = diagnostics.courseBreakdown.find((c) => c.courseCode === 'DES101');
      expect(des101Diag?.conflictingSections).toBe(1);
      expect(des101Diag?.hasNonConflictingSections).toBe(false);
    });
  });
});
