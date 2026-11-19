import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  checkSectionConflictsInputShape,
  exportScheduleIcsInputShape,
  generateSchedulesInputShape,
  getCourseDetailsInputShape,
  handleCheckSectionConflicts,
  handleExportScheduleIcs,
  handleGenerateSchedules,
  handleGetCourseDetails,
  handleListSemesters,
  handleListSubjects,
  handleSearchCourses,
  listSubjectsInputShape,
  searchCoursesInputShape,
} from './tools';
import type { CourseDataSource } from './types';

const SERVER_INFO = {
  name: 'aurais-courses',
  version: '1.0.0',
} as const;

const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function jsonToolResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function readSingleVariable(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function createCoursesMcpServer(dataSource: CourseDataSource): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions:
      'AuraIsHub Courses MCP Server. Read-only access to university semesters, course catalog, section schedules, conflict checking, combinatorial timetable generation, and iCalendar (.ics) export. Does not expose trading board or Rate My Professor data.',
  });

  server.registerTool(
    'list_semesters',
    {
      title: 'List Semesters',
      description:
        'List all available academic semesters and identify the default active semester ID.',
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async () => jsonToolResult(await handleListSemesters(dataSource)),
  );

  server.registerTool(
    'list_subjects',
    {
      title: 'List Subjects',
      description:
        'List all distinct subject codes (e.g. CS, MATH) and their course counts for a semester.',
      inputSchema: listSubjectsInputShape,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => jsonToolResult(await handleListSubjects(dataSource, args)),
  );

  server.registerTool(
    'search_courses',
    {
      title: 'Search Courses',
      description:
        'Search and filter courses in a semester by keyword (code, title, description, or instructor), subject, credit range, or open seat availability.',
      inputSchema: searchCoursesInputShape,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => jsonToolResult(await handleSearchCourses(dataSource, args)),
  );

  server.registerTool(
    'get_course_details',
    {
      title: 'Get Course Details',
      description:
        'Fetch complete metadata and all sections (instructors, seat counts, meeting days and times) for a single course by courseCode or courseId.',
      inputSchema: getCourseDetailsInputShape,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => jsonToolResult(await handleGetCourseDetails(dataSource, args)),
  );

  server.registerTool(
    'check_section_conflicts',
    {
      title: 'Check Section Conflicts',
      description:
        'Validate a set of sections for time overlaps or duplicate courses, returning conflicts, total credits, and a day-by-day weekly schedule breakdown.',
      inputSchema: checkSectionConflictsInputShape,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => jsonToolResult(await handleCheckSectionConflicts(dataSource, args)),
  );

  server.registerTool(
    'generate_schedules',
    {
      title: 'Generate Schedules',
      description:
        'Generate and rank conflict-free timetables for a set of courses using time window, gap, day-avoidance, credit, instructor-blocking, open-seat, and pinned-section constraints.',
      inputSchema: generateSchedulesInputShape,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => jsonToolResult(await handleGenerateSchedules(dataSource, args)),
  );

  server.registerTool(
    'export_schedule_ics',
    {
      title: 'Export Schedule to iCalendar (.ics)',
      description:
        'Export a set of chosen sections as an RFC 5545 iCalendar (.ics) document with weekly recurring class events.',
      inputSchema: exportScheduleIcsInputShape,
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) => jsonToolResult(await handleExportScheduleIcs(dataSource, args)),
  );

  server.registerResource(
    'semesters',
    'courses://semesters',
    {
      title: 'Available Semesters',
      description: 'JSON list of available academic semesters in AuraIsHub.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(await handleListSemesters(dataSource), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    'semester-subjects',
    new ResourceTemplate('courses://semesters/{semesterId}/subjects', { list: undefined }),
    {
      title: 'Semester Subjects',
      description: 'Distinct subject codes and course counts for a specific semester.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const semesterId = decodeURIComponent(readSingleVariable(variables.semesterId));
      const payload = await handleListSubjects(dataSource, { semesterId });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    'course-details',
    new ResourceTemplate('courses://semesters/{semesterId}/course/{courseCode}', {
      list: undefined,
    }),
    {
      title: 'Course Details',
      description:
        'Canonical course metadata and section list for a given semester and course code.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const semesterId = decodeURIComponent(readSingleVariable(variables.semesterId));
      const courseCode = decodeURIComponent(readSingleVariable(variables.courseCode));
      const payload = await handleGetCourseDetails(dataSource, { semesterId, courseCode });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'plan-semester-schedule',
    {
      title: 'Plan Semester Schedule',
      description:
        'Guided workflow to pick courses, apply time/day/instructor preferences, and compare top conflict-free timetables.',
      argsSchema: {
        semesterId: z.string().optional().describe('Semester ID (defaults to active semester)'),
        courses: z.string().describe('Comma-separated target course codes or topics'),
        preferences: z
          .string()
          .optional()
          .describe('Optional constraints like "no Fridays, start after 10:00, open seats only"'),
      },
    },
    ({ semesterId, courses, preferences }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Help me build a conflict-free course schedule using the AuraIsHub Courses MCP tools.',
              semesterId
                ? `Target semester: ${semesterId}`
                : 'First call list_semesters to select the default active semester.',
              `Desired courses/topics: ${courses}`,
              preferences
                ? `Preferences: ${preferences}`
                : 'Ask if any time/day preferences apply.',
              'Steps: resolve exact course codes via search_courses / get_course_details, run generate_schedules, present the top 3 ranked schedules clearly (days, times, instructors, seat availability, total credits), and offer .ics export via export_schedule_ics.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'find-electives',
    {
      title: 'Find Non-Conflicting Electives',
      description:
        'Find open-seat elective courses that fit cleanly around a student’s fixed/pinned sections.',
      argsSchema: {
        semesterId: z.string().optional().describe('Semester ID (defaults to active semester)'),
        fixedSections: z
          .string()
          .describe('Current fixed sections (e.g. "CS 101 section 1, MATH 201 section 2")'),
        topicOrSubject: z.string().describe('Desired subject code or interest area for electives'),
      },
    },
    ({ semesterId, fixedSections, topicOrSubject }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Find open-seat elective courses that do not conflict with my existing schedule using AuraIsHub Courses MCP tools.',
              semesterId
                ? `Semester: ${semesterId}`
                : 'First call list_semesters to identify the active semester.',
              `Fixed sections: ${fixedSections}`,
              `Elective topic or subject: ${topicOrSubject}`,
              'Steps: verify fixed sections with check_section_conflicts, search open-seat candidates via search_courses (openSeatsOnly: true), check each candidate against the fixed sections using check_section_conflicts or generate_schedules, and rank the best-fitting options.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  return server;
}
