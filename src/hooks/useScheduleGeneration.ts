import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useConfigContext } from '../context/ConfigContext';
import { useOptionalToast } from '../context/ToastContext';
import { searchSchedules } from '../services/search';
import type { Course, Preferences, Schedule, Section } from '../types';
import type { ScheduleDiagnostics } from '../utils/schedule-diagnostics';
import { diagnoseEmptyGeneration } from '../utils/schedule-diagnostics';
import type { PrefilterSummary } from '../utils/schedule-prefilter';
import { buildSectionsByCourse, prefilterSections } from '../utils/schedule-prefilter';
import type { GeneratedSchedule, SearchResult } from '../utils/schedule-types';
import { DEFAULT_MAX_SCHEDULES } from '../utils/schedule-types';

interface UseScheduleGenerationOptions {
  schedule: Schedule | null;
  allCourses: Course[];
  allSections: Section[];
  applySchedule: (newSchedule: Schedule) => Promise<void>;
}

/**
 * Schedule generation state and actions shared by "Find Best Schedule" and
 * "View All Alternatives", plus the explorer-dialog state they feed.
 */
export function useScheduleGeneration({
  schedule,
  allCourses,
  allSections,
  applySchedule,
}: UseScheduleGenerationOptions) {
  const { profile } = useAuthContext();
  const { preferences } = useConfigContext();
  const toastContext = useOptionalToast();
  const toast = toastContext?.toast;

  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string>('');
  const [previousSchedule, setPreviousSchedule] = useState<Schedule | null>(null);

  const [scheduleExplorerOpen, setScheduleExplorerOpen] = useState(false);
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSchedule[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedSchedule, setSelectedSchedule] = useState<GeneratedSchedule | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showConflicting, setShowConflicting] = useState(false);
  const [scheduleDiagnostics, setScheduleDiagnostics] = useState<ScheduleDiagnostics | null>(null);
  const [prefilterSummary, setPrefilterSummary] = useState<PrefilterSummary | null>(null);

  const sectionsByCourseForSchedule = useCallback(() => {
    return buildSectionsByCourse(
      schedule?.sections ?? [],
      allSections,
      profile?.pinnedSelections ?? {},
    );
  }, [schedule, allSections, profile?.pinnedSelections]);

  const getEffectivePreferences = useCallback((): Preferences => {
    if (!schedule || schedule.sections.length === 0) return preferences;
    const scheduleCredits = schedule.totalCredits || 1;
    return {
      ...preferences,
      minCredits: Math.min(preferences.minCredits ?? 12, scheduleCredits),
      maxCredits: Math.max(preferences.maxCredits ?? 18, scheduleCredits),
    };
  }, [schedule, preferences]);

  const handleOptimize = async () => {
    if (!schedule || schedule.sections.length === 0) {
      const msg = 'No courses selected. Please select some courses first.';
      setError(msg);
      toast?.warning(msg);
      return;
    }

    setOptimizing(true);
    setError('');
    setPrefilterSummary(null);

    const effectivePrefs = getEffectivePreferences();

    try {
      let candidates: Schedule[] = [];

      try {
        const { generateSchedulesApi } = await import('../services/schedulesApi');
        const res = await generateSchedulesApi({
          courses: allCourses,
          sections: allSections,
          scheduleSections: schedule.sections,
          pinnedSelections: profile?.pinnedSelections ?? {},
          preferences: effectivePrefs,
          options: { maxSchedules: 200 },
        });
        candidates = res.schedules;
        setPrefilterSummary(res.summary);
      } catch {
        const { generateSchedules } = await import('../utils/schedule-generator');
        const sectionsByCourse = sectionsByCourseForSchedule();
        const courseCodeMap = new Map(allCourses.map((c) => [c.id, c.code]));
        const { sectionsByCourse: filteredByCourse, summary } = prefilterSections(
          sectionsByCourse,
          effectivePrefs,
          courseCodeMap,
        );
        setPrefilterSummary(summary);

        candidates = generateSchedules(allCourses, filteredByCourse, effectivePrefs, {
          maxSchedules: 200,
        }).map<Schedule>((g) => ({
          id: g.id,
          sections: g.sections,
          totalCredits: g.totalCredits,
          score: g.score,
          conflicts: g.conflicts,
        }));
      }

      if (candidates.length === 0) {
        if (schedule.conflicts && schedule.conflicts.length > 0) {
          toast?.warning(
            'Could not find a conflict-free timetable. Try unpinning locked sections or adjusting preferences.',
          );
        } else {
          toast?.info('Your current timetable is already the optimal section combination.');
        }
        return;
      }

      const bestSchedule = [...candidates].sort((a, b) => b.score - a.score)[0];
      if (bestSchedule) {
        const currentSectionIds = new Set(schedule.sections.map((s) => s.id));
        const isIdentical =
          bestSchedule.sections.length === schedule.sections.length &&
          bestSchedule.sections.every((s) => currentSectionIds.has(s.id));

        if (isIdentical) {
          if (schedule.conflicts && schedule.conflicts.length > 0) {
            toast?.warning(
              'No alternative section combination could resolve the schedule conflicts.',
            );
          } else {
            toast?.info('Your current timetable is already the optimal section combination.');
          }
        } else {
          setPreviousSchedule(schedule);
          await applySchedule(bestSchedule);
          if (
            schedule.conflicts &&
            schedule.conflicts.length > 0 &&
            bestSchedule.conflicts.length === 0
          ) {
            toast?.success(
              `Conflicts resolved! Applied optimal schedule (Score: ${Math.round(bestSchedule.score)})`,
            );
          } else {
            toast?.success(`Optimized schedule applied (Score: ${Math.round(bestSchedule.score)})`);
          }
        }
      }
    } catch (err) {
      const errMessage = (err as Error).message;
      const msg = `Optimization failed: ${errMessage}`;
      setError(msg);
      toast?.error(msg);
    } finally {
      setOptimizing(false);
    }
  };

  const handleUndoOptimize = useCallback(async () => {
    if (previousSchedule) {
      await applySchedule(previousSchedule);
      setPreviousSchedule(null);
      toast?.success('Reverted to previous schedule');
    }
  }, [previousSchedule, applySchedule, toast]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const handleGenerateAll = useCallback(async () => {
    if (!schedule || allCourses.length === 0 || allSections.length === 0) return;

    setGenerating(true);
    setGenerationProgress(0);
    setGeneratedSchedules([]);
    setSelectedSchedule(null);
    setScheduleDiagnostics(null);
    setPrefilterSummary(null);

    const effectivePrefs = getEffectivePreferences();

    try {
      let schedules: GeneratedSchedule[] = [];
      let summary: PrefilterSummary | null = null;
      let diagnostics: ScheduleDiagnostics | null = null;

      try {
        const { generateSchedulesApi } = await import('../services/schedulesApi');
        const res = await generateSchedulesApi({
          courses: allCourses,
          sections: allSections,
          scheduleSections: schedule.sections,
          pinnedSelections: profile?.pinnedSelections ?? {},
          preferences: effectivePrefs,
          options: { maxSchedules: DEFAULT_MAX_SCHEDULES },
        });
        schedules = res.schedules;
        summary = res.summary;
        diagnostics = res.diagnostics;
      } catch {
        const { generateSchedules } = await import('../utils/schedule-generator');
        const prefs = effectivePrefs;
        const sectionsByCourse = sectionsByCourseForSchedule();

        if (sectionsByCourse.size > 0) {
          const courseCodeMap = new Map(allCourses.map((c) => [c.id, c.code]));
          const prefilterRes = prefilterSections(sectionsByCourse, prefs, courseCodeMap);
          summary = prefilterRes.summary;

          schedules = generateSchedules(allCourses, prefilterRes.sectionsByCourse, prefs, {
            maxSchedules: DEFAULT_MAX_SCHEDULES,
            onProgress: setGenerationProgress,
          });

          if (schedules.length === 0) {
            diagnostics = diagnoseEmptyGeneration(
              allCourses,
              sectionsByCourse,
              prefs,
              new Map(Object.entries(profile?.pinnedSelections ?? {})),
            );
          }
        }
      }

      setPrefilterSummary(summary);
      setScheduleDiagnostics(diagnostics);
      setGeneratedSchedules(schedules);
      if (schedules.length > 0) {
        setSelectedSchedule(schedules[0]);
      }
      setScheduleExplorerOpen(true);
    } catch (err) {
      const msg = `Failed to generate schedules: ${(err as Error).message}`;
      setError(msg);
      toast?.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [
    schedule,
    allCourses,
    allSections,
    profile,
    sectionsByCourseForSchedule,
    toast,
    getEffectivePreferences,
  ]);

  const handleApplySchedule = useCallback(
    async (genSchedule: GeneratedSchedule) => {
      setScheduleExplorerOpen(false);

      const newSchedule: Schedule = {
        id: genSchedule.id,
        sections: genSchedule.sections,
        totalCredits: genSchedule.totalCredits,
        score: genSchedule.score,
        conflicts: genSchedule.conflicts,
      };

      await applySchedule(newSchedule);
      toast?.success('Selected schedule applied successfully');
    },
    [applySchedule, toast],
  );

  useEffect(() => {
    if (!searchQuery.trim() || generatedSchedules.length === 0) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const results = searchSchedules(generatedSchedules, searchQuery);
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, generatedSchedules]);

  return {
    // optimize/generate actions
    optimizing,
    error,
    clearError,
    previousSchedule,
    handleOptimize,
    handleUndoOptimize,
    generating,
    generationProgress,
    handleGenerateAll,
    handleApplySchedule,
    scheduleExplorerOpen,
    setScheduleExplorerOpen,
    generatedSchedules,
    selectedSchedule,
    setSelectedSchedule,
    searchQuery,
    setSearchQuery,
    searchResults,
    showConflicting,
    setShowConflicting,
    scheduleDiagnostics,
    prefilterSummary,
  };
}
