import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useConfigContext } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { searchSchedules } from '../services/search';
import type { Course, Schedule, Section } from '../types';
import type { ScheduleDiagnostics } from '../utils/schedule-diagnostics';
import { diagnoseEmptyGeneration } from '../utils/schedule-diagnostics';
import type { PrefilterSummary } from '../utils/schedule-prefilter';
import { buildSectionsByCourse, prefilterSections } from '../utils/schedule-prefilter';
import type { GeneratedSchedule, SearchResult } from '../utils/schedule-types';
import { DEFAULT_MAX_SCHEDULES } from '../utils/schedule-types';

interface UseScheduleGenerationOptions {
  schedule: Schedule | null;
  setSchedule: React.Dispatch<React.SetStateAction<Schedule | null>>;
  allCourses: Course[];
  allSections: Section[];
}

/**
 * Schedule generation state and actions shared by "Find Best Schedule" and
 * "View All Alternatives", plus the explorer-dialog state they feed.
 */
export function useScheduleGeneration({
  schedule,
  setSchedule,
  allCourses,
  allSections,
}: UseScheduleGenerationOptions) {
  const { profile, updateProfile } = useAuthContext();
  const { preferences } = useConfigContext();
  const { toast } = useToast();

  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string>('');

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

  const handleOptimize = async () => {
    if (!schedule) {
      setError('No courses selected. Please select some courses first.');
      return;
    }

    setOptimizing(true);
    setError('');
    setPrefilterSummary(null);

    try {
      const { generateSchedules } = await import('../utils/schedule-generator');

      const sectionsByCourse = sectionsByCourseForSchedule();
      const courseCodeMap = new Map(allCourses.map((c) => [c.id, c.code]));
      const { sectionsByCourse: filteredByCourse, summary } = prefilterSections(
        sectionsByCourse,
        preferences,
        courseCodeMap,
      );
      setPrefilterSummary(summary);

      let candidates = generateSchedules(allCourses, filteredByCourse, preferences, {
        maxSchedules: 200,
      }).map<Schedule>((g) => ({
        id: g.id,
        name: `Candidate ${g.id}`,
        sections: g.sections,
        totalCredits: g.totalCredits,
        score: g.score,
        conflicts: g.conflicts,
      }));

      if (candidates.length === 0) {
        candidates = [schedule];
      }

      const bestSchedule = [...candidates].sort((a, b) => b.score - a.score)[0];
      if (bestSchedule) {
        setSchedule(bestSchedule);
        const selections = bestSchedule.sections.reduce(
          (acc, section) => {
            acc[section.courseId] = section.id;
            return acc;
          },
          {} as Record<string, string>,
        );
        try {
          await updateProfile({ courseSelections: selections });
        } catch {
          toast.error('Failed to save optimized schedule. Please try again.');
        }
      }
    } catch (err) {
      const error = err as Error;
      setError(`Optimization failed: ${error.message}`);
    } finally {
      setOptimizing(false);
    }
  };

  const handleGenerateAll = useCallback(async () => {
    if (!schedule || allCourses.length === 0 || allSections.length === 0) return;

    setGenerating(true);
    setGenerationProgress(0);
    setGeneratedSchedules([]);
    setSelectedSchedule(null);
    setScheduleDiagnostics(null);
    setPrefilterSummary(null);

    try {
      const { generateSchedules } = await import('../utils/schedule-generator');
      const prefs = preferences;

      const sectionsByCourse = sectionsByCourseForSchedule();

      if (sectionsByCourse.size === 0) {
        setGeneratedSchedules([]);
        setGenerating(false);
        return;
      }

      const courseCodeMap = new Map(allCourses.map((c) => [c.id, c.code]));
      const { sectionsByCourse: filteredByCourse, summary } = prefilterSections(
        sectionsByCourse,
        prefs,
        courseCodeMap,
      );
      setPrefilterSummary(summary);

      const schedules = generateSchedules(allCourses, filteredByCourse, prefs, {
        maxSchedules: DEFAULT_MAX_SCHEDULES,
        onProgress: setGenerationProgress,
      });

      if (schedules.length === 0) {
        const diagnostics = diagnoseEmptyGeneration(
          allCourses,
          sectionsByCourse,
          prefs,
          new Map(Object.entries(profile?.pinnedSelections ?? {})),
        );
        setScheduleDiagnostics(diagnostics);
      }

      setGeneratedSchedules(schedules);
      if (schedules.length > 0) {
        setSelectedSchedule(schedules[0]);
      }
      setScheduleExplorerOpen(true);
    } catch (err) {
      setError(`Failed to generate schedules: ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }, [schedule, allCourses, allSections, preferences, profile, sectionsByCourseForSchedule]);

  const handleApplySchedule = useCallback(
    async (genSchedule: GeneratedSchedule) => {
      const selections = genSchedule.sections.reduce(
        (acc: Record<string, string>, section: Section) => {
          acc[section.courseId] = section.id;
          return acc;
        },
        {} as Record<string, string>,
      );
      try {
        await updateProfile({ courseSelections: selections });
      } catch {
        toast.error('Failed to save schedule. Please try again.');
      }
      setScheduleExplorerOpen(false);

      const newSchedule: Schedule = {
        id: genSchedule.id,
        name: 'Applied Schedule',
        sections: genSchedule.sections,
        totalCredits: genSchedule.totalCredits,
        score: genSchedule.score,
        conflicts: genSchedule.conflicts,
      };
      setSchedule(newSchedule);
    },
    [updateProfile, setSchedule, toast.error],
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
    handleOptimize,
    generating,
    generationProgress,
    handleGenerateAll,
    handleApplySchedule,
    // explorer dialog state
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
