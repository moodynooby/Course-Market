import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course, Schedule, Section } from '../../types';
import { useScheduleGeneration } from '../useScheduleGeneration';

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({
    profile: { pinnedSelections: {} },
  }),
}));

vi.mock('../../services/schedulesApi', () => ({
  generateSchedulesApi: vi.fn().mockRejectedValue(new Error('Use local generator fallback')),
}));

const basePreferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '18:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: false,
  preferMorning: true,
  preferAfternoon: false,
  preferEvening: false,
  minCredits: 1,
  maxCredits: 20,
  avoidDays: [],
};

vi.mock('../../context/ConfigContext', () => ({
  useConfigContext: () => ({
    preferences: basePreferences,
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useOptionalToast: () => ({
    toast: mockToast,
  }),
}));

const mockCourse: Course = {
  id: 'course-1',
  code: 'CSE101',
  name: 'Intro to CS',
  subject: 'CSE',
  credits: 3,
};

const mockSection1: Section = {
  id: 'sec-1',
  courseId: 'course-1',
  sectionNumber: '1',
  instructor: 'Turing',
  capacity: 30,
  enrolled: 20,
  timeSlots: [
    { day: 'M', startTime: '09:00', endTime: '10:15' },
    { day: 'M', startTime: '12:00', endTime: '13:15' },
  ],
};

const mockSection2: Section = {
  id: 'sec-2',
  courseId: 'course-1',
  sectionNumber: '2',
  instructor: 'Hopper',
  capacity: 30,
  enrolled: 20,
  timeSlots: [{ day: 'T', startTime: '11:00', endTime: '12:15' }],
};

const mockInitialSchedule: Schedule = {
  id: 'sched-1',
  sections: [mockSection1],
  totalCredits: 3,
  score: 50,
  conflicts: [],
};

describe('useScheduleGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows warning toast if handleOptimize is invoked without a schedule', async () => {
    const applySchedule = vi.fn();
    const { result } = renderHook(() =>
      useScheduleGeneration({
        schedule: null,
        allCourses: [mockCourse],
        allSections: [mockSection1],
        applySchedule,
      }),
    );

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(mockToast.warning).toHaveBeenCalledWith(
      'No courses selected. Please select some courses first.',
    );
    expect(result.current.error).toBe('No courses selected. Please select some courses first.');
    expect(applySchedule).not.toHaveBeenCalled();
  });

  it('detects when schedule is already optimal and shows info toast', async () => {
    const applySchedule = vi.fn();
    const { result } = renderHook(() =>
      useScheduleGeneration({
        schedule: mockInitialSchedule,
        allCourses: [mockCourse],
        allSections: [mockSection1], // Only 1 section available, identical to current
        applySchedule,
      }),
    );

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(mockToast.info).toHaveBeenCalledWith(
      'Your current timetable is already the optimal section combination.',
    );
    expect(applySchedule).not.toHaveBeenCalled();
  });

  it('reverts to previous schedule when handleUndoOptimize is called', async () => {
    const applySchedule = vi.fn();
    const { result } = renderHook(() =>
      useScheduleGeneration({
        schedule: mockInitialSchedule,
        allCourses: [mockCourse],
        allSections: [mockSection1, mockSection2],
        applySchedule,
      }),
    );

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(result.current.previousSchedule).toEqual(mockInitialSchedule);

    await act(async () => {
      await result.current.handleUndoOptimize();
    });

    expect(applySchedule).toHaveBeenCalledWith(mockInitialSchedule);
    expect(mockToast.success).toHaveBeenCalledWith('Reverted to previous schedule');
    expect(result.current.previousSchedule).toBeNull();
  });

  it('applies selected schedule from explorer and shows success toast', async () => {
    const applySchedule = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useScheduleGeneration({
        schedule: mockInitialSchedule,
        allCourses: [mockCourse],
        allSections: [mockSection1],
        applySchedule,
      }),
    );

    const generatedSchedule: Schedule = {
      ...mockInitialSchedule,
      score: 95,
    };

    await act(async () => {
      await result.current.handleApplySchedule(generatedSchedule);
    });

    expect(applySchedule).toHaveBeenCalledWith(generatedSchedule);
    expect(mockToast.success).toHaveBeenCalledWith('Selected schedule applied successfully');
  });

  it('resolves conflicts when alternatives exist and shows conflict-resolved toast', async () => {
    const course2: Course = {
      id: 'course-2',
      code: 'CSE102',
      name: 'Data Structures',
      subject: 'CSE',
      credits: 3,
    };

    // Conflicting section at same time as mockSection1 (Monday 09:00)
    const conflictingSec: Section = {
      id: 'sec-conflict',
      courseId: 'course-2',
      sectionNumber: '1',
      instructor: 'Knuth',
      capacity: 30,
      enrolled: 20,
      timeSlots: [{ day: 'M', startTime: '09:00', endTime: '10:15' }],
    };

    // Non-conflicting alternative section on Wednesday
    const nonConflictingSec: Section = {
      id: 'sec-clear',
      courseId: 'course-2',
      sectionNumber: '2',
      instructor: 'Knuth',
      capacity: 30,
      enrolled: 20,
      timeSlots: [{ day: 'W', startTime: '14:00', endTime: '15:15' }],
    };

    const conflictedSchedule: Schedule = {
      id: 'sched-conflicted',
      sections: [mockSection1, conflictingSec],
      totalCredits: 6,
      score: 10,
      conflicts: ['Time conflict on Monday 09:00'],
    };

    const applySchedule = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useScheduleGeneration({
        schedule: conflictedSchedule,
        allCourses: [mockCourse, course2],
        allSections: [mockSection1, conflictingSec, nonConflictingSec],
        applySchedule,
      }),
    );

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(applySchedule).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining('Conflicts resolved! Applied optimal schedule'),
    );
  });
});
