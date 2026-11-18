import { describe, expect, it } from 'vitest';
import {
  handleCheckSectionConflicts,
  handleExportScheduleIcs,
  handleGenerateSchedules,
  handleGetCourseDetails,
  handleListSemesters,
  handleListSubjects,
  handleSearchCourses,
} from '../tools';
import { createMockCourseDataSource } from './mock-data-source';

describe('courses MCP tools', () => {
  const ds = createMockCourseDataSource();

  it('lists semesters and highlights the active default', async () => {
    const result = await handleListSemesters(ds);
    expect(result.defaultSemesterId).toBe('Winter2027');
    expect(result.semesters).toHaveLength(2);
  });

  it('lists subjects and course counts for a semester', async () => {
    const result = await handleListSubjects(ds, { semesterId: 'Winter2027' });
    expect(result.totalSubjects).toBe(3);
    expect(result.subjects).toEqual([
      { subject: 'CS', courseCount: 1 },
      { subject: 'ENG', courseCount: 1 },
      { subject: 'MATH', courseCount: 1 },
    ]);
  });

  it('searches courses compactly by default and supports includeSections', async () => {
    const compact = await handleSearchCourses(ds, {
      semesterId: 'Winter2027',
      q: 'Turing',
    });
    expect(compact.total).toBe(1);
    expect(compact.courses[0].code).toBe('CS 101');
    expect(compact.courses[0].openSectionCount).toBe(1);
    expect('sections' in compact.courses[0]).toBe(false);

    const expanded = await handleSearchCourses(ds, {
      semesterId: 'Winter2027',
      subject: 'CS',
      includeSections: true,
    });
    expect(expanded.courses[0]).toHaveProperty('sections');
    expect(expanded.courses[0].sections).toHaveLength(2);
  });

  it('returns course details or a structured not-found result', async () => {
    const found = await handleGetCourseDetails(ds, {
      semesterId: 'Winter2027',
      courseCode: 'cs101',
    });
    expect(found).toMatchObject({ found: true, course: { code: 'CS 101' } });
    if ('sections' in found && found.sections) {
      expect(found.sections[0].seatsRemaining).toBe(5);
      expect(found.sections[1].hasOpenSeats).toBe(false);
    }

    const missing = await handleGetCourseDetails(ds, {
      semesterId: 'Winter2027',
      courseCode: 'BIO 999',
    });
    expect(missing).toMatchObject({ found: false });

    const invalid = await handleGetCourseDetails(ds, { semesterId: 'Winter2027' });
    expect(invalid).toHaveProperty('error');
  });

  it('detects time overlaps and duplicate courses in check_section_conflicts', async () => {
    const conflict = await handleCheckSectionConflicts(ds, {
      semesterId: 'Winter2027',
      selections: [
        { courseCode: 'CS 101', sectionNumber: '1' },
        { courseCode: 'MATH 201', sectionNumber: '1' },
      ],
    });
    expect(conflict.hasConflicts).toBe(true);
    expect(conflict.conflictCount).toBe(1);
    expect(conflict.conflicts[0].reason).toContain('Time overlap');

    const clean = await handleCheckSectionConflicts(ds, {
      semesterId: 'Winter2027',
      sectionIds: ['s-cs101-1', 's-math201-2'],
    });
    expect(clean.hasConflicts).toBe(false);
    expect(clean.totalCredits).toBe(6);
    expect(clean.byDay.M).toHaveLength(2);
  });

  it('generates conflict-free schedules with openSeatsOnly, blockedInstructors, and pinnedSections', async () => {
    const result = await handleGenerateSchedules(ds, {
      semesterId: 'Winter2027',
      courseCodes: ['CS 101', 'MATH 201'],
      openSeatsOnly: true,
    });
    expect(result.totalGenerated).toBe(1);
    expect(result.schedules[0].sections.map((s) => s.id).sort()).toEqual([
      's-cs101-1',
      's-math201-2',
    ]);

    const blocked = await handleGenerateSchedules(ds, {
      semesterId: 'Winter2027',
      courseCodes: ['CS 101', 'MATH 201'],
      pinnedSections: { 'CS 101': '1' },
      blockedInstructors: ['Gauss'],
    });
    expect(blocked.totalGenerated).toBe(0);
    expect(blocked.diagnostics?.hasIssues).toBe(true);
  });

  it('exports valid iCalendar (.ics) content for selected sections', async () => {
    const exported = await handleExportScheduleIcs(ds, {
      semesterId: 'Winter2027',
      sectionIds: ['s-cs101-1', 's-eng105-1'],
    });
    expect(exported.sectionCount).toBe(2);
    expect(exported.totalCredits).toBe(6);
    expect(exported.ics).toContain('BEGIN:VCALENDAR');
    expect(exported.ics).toContain('SUMMARY:CS 101 - 1');
    expect(exported.ics).toContain('SUMMARY:ENG 105 - 1');
    expect(exported.ics).toContain('END:VCALENDAR');
  });
});
