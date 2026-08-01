import { ArrowForward, AutoAwesome } from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiKeyDialog from '../components/ApiKeyDialog';
import { OptimizationPanel } from '../components/dashboard/OptimizationPanel';
import { ScheduleOverview } from '../components/dashboard/ScheduleOverview';
import { SelectedCoursesList } from '../components/dashboard/SelectedCoursesList';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PreferencesSummaryCard } from '../components/PreferencesSummaryCard';
import { useAuthContext } from '../context/AuthContext';
import { useConfigContext } from '../context/ConfigContext';
import { useThemeMode } from '../context/ThemeContext';
import { searchSchedules } from '../services/search';
import type { Course, Schedule, Section } from '../types';
import { checkConflicts } from '../utils/schedule';
import type { ScheduleDiagnostics } from '../utils/schedule-diagnostics';
import { diagnoseEmptyGeneration } from '../utils/schedule-diagnostics';
import type { PrefilterSummary } from '../utils/schedule-prefilter';
import { buildSectionsByCourse, prefilterSections } from '../utils/schedule-prefilter';
import type { GeneratedSchedule, SearchResult } from '../utils/schedule-types';
import { DEFAULT_MAX_SCHEDULES } from '../utils/schedule-types';

const ScheduleExplorerDialog = lazy(() =>
  import('../components/schedule-explorer/ScheduleExplorerDialog').then((module) => ({
    default: module.ScheduleExplorerDialog,
  })),
);

export default function LandingPage() {
  const navigate = useNavigate();
  const { getToken, profile, updateProfile } = useAuthContext();
  const { preferences, llmConfig, updateLlmConfig } = useConfigContext();
  const { mode, setMode } = useThemeMode();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [coursesImported, setCoursesImported] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);

  const [optimizing, setOptimizing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [webllmAvailable, setWebllmAvailable] = useState(false);
  const [initProgress, setInitProgress] = useState<{ text: string; percent: number }>({
    text: '',
    percent: 0,
  });
  const [error, setError] = useState<string>('');
  const [webgpuWarningOpen, setWebgpuWarningOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

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
  const dataLoadedRef = useRef(false);
  const coursesRef = useRef<Course[]>([]);
  const sectionsRef = useRef<Section[]>([]);

  useEffect(() => {
    coursesRef.current = allCourses;
    sectionsRef.current = allSections;
  }, [allCourses, allSections]);

  const loadScheduleFromSelections = useCallback(
    (courses: Course[], sections: Section[]) => {
      const selections = profile?.courseSelections || {};

      if (Object.keys(selections).length === 0) {
        setSchedule(null);
        setCoursesImported(courses.length > 0);
        return;
      }

      try {
        const sectionMap = new Map(sections.map((s) => [s.id, s]));
        const selectedSections: Section[] = [];
        Object.entries(selections).forEach(([, sectionId]) => {
          const section = sectionMap.get(sectionId);
          if (section) selectedSections.push(section);
        });

        if (selectedSections.length === 0) {
          setSchedule(null);
          setCoursesImported(courses.length > 0);
          return;
        }

        const totalCredits = selectedSections.reduce((sum, s) => {
          const course = courses.find((c) => c.id === s.courseId);
          return sum + (course?.credits || 3);
        }, 0);

        setSchedule({
          id: 'current',
          name: 'Current Selection',
          sections: selectedSections,
          totalCredits,
          score: 0,
          conflicts: checkConflicts(selectedSections),
        });
        setCoursesImported(courses.length > 0);
      } catch (err) {
        console.error('Failed to load schedule from selections:', err);
        setSchedule(null);
        setCoursesImported(courses.length > 0);
      }
    },
    [profile],
  );

  const loadData = useCallback(async () => {
    try {
      if (dataLoadedRef.current) {
        if (coursesRef.current.length > 0 && sectionsRef.current.length > 0) {
          loadScheduleFromSelections(coursesRef.current, sectionsRef.current);
        }
        return;
      }

      const { getSemesters, getSemesterData } = await import('../services/coursesApi');
      const { semesters } = await getSemesters();

      if (!semesters || semesters.length === 0) {
        console.warn('No semesters available');
        setAllCourses([]);
        setAllSections([]);
        setCoursesImported(false);
        setLoading(false);
        return;
      }

      const activeSemester = semesters.find((s) => s.isActive) || semesters[0];
      const semesterId = activeSemester.id;

      const { courses, sections } = await getSemesterData(semesterId);

      setAllCourses(courses);
      setAllSections(sections);
      loadScheduleFromSelections(courses, sections);

      dataLoadedRef.current = true;
    } catch (error) {
      console.error('Failed to load semester data:', error);
      setAllCourses([]);
      setAllSections([]);
      setCoursesImported(false);
    } finally {
      setLoading(false);
    }
  }, [loadScheduleFromSelections]);

  useEffect(() => {
    loadData();
    setWebllmAvailable('gpu' in navigator);
  }, [loadData]);

  useEffect(() => {
    if (profile?.preferences?.theme && profile.preferences.theme !== mode) {
      setMode(profile.preferences.theme);
    }
  }, [profile, mode, setMode]);

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

  const handleOptimize = async () => {
    if (!schedule) {
      setError('No courses selected. Please select some courses first.');
      return;
    }

    setOptimizing(true);
    setError('');
    setInitProgress({ text: '', percent: 0 });
    setPrefilterSummary(null);

    try {
      const { optimizeWithLLM } = await import('../services/llm');
      const { generateSchedules } = await import('../utils/schedule-generator');
      const token = await getToken();

      const sectionsByCourse = buildSectionsByCourse(
        schedule.sections,
        allSections,
        profile?.pinnedSelections ?? {},
      );
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

      const result = await optimizeWithLLM(
        candidates,
        preferences,
        token || '',
        {
          provider: llmConfig.provider as 'webllm' | 'groq',
          model: llmConfig.model,
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens,
          initProgressCallback: (report: { progress: number; text: string }) => {
            setInitProgress({ text: report.text, percent: report.progress * 100 });
          },
        },
        allSections,
      );

      if (result.bestSchedule) {
        setSchedule(result.bestSchedule);
        const selections = result.bestSchedule.sections.reduce(
          (acc, section) => {
            acc[section.courseId] = section.id;
            return acc;
          },
          {} as Record<string, string>,
        );
        updateProfile({ courseSelections: selections });
      }

      setAiAnalysis(result.aiAnalysis || 'Schedule optimized successfully.');
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'KEY_REQUIRED') {
        setApiKeyDialogOpen(true);
      } else {
        setError(`Optimization failed: ${error.message}`);
      }
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

      const sectionsByCourse = buildSectionsByCourse(
        schedule.sections,
        allSections,
        profile?.pinnedSelections ?? {},
      );

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
  }, [schedule, allCourses, allSections, preferences, profile]);

  const handleApplySchedule = useCallback(
    (genSchedule: GeneratedSchedule) => {
      const selections = genSchedule.sections.reduce(
        (acc: Record<string, string>, section: Section) => {
          acc[section.courseId] = section.id;
          return acc;
        },
        {} as Record<string, string>,
      );
      updateProfile({ courseSelections: selections });
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
    [updateProfile],
  );

  const hasCourses = schedule && schedule.sections.length > 0;

  return (
    <Box>
      <Box component="header" sx={{ mb: 5 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Review your schedule, browse courses, and optimize your timetable.
        </Typography>
      </Box>
      {loading ? (
        <Card
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            mb: 4,
            borderRadius: 4,
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
            }}
          >
            Loading your courses...
          </Typography>
        </Card>
      ) : !coursesImported ? (
        <Card
          variant="outlined"
          sx={{
            p: 5,
            textAlign: 'center',
            mb: 4,
            borderRadius: 6,
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.secondary?.main || theme.palette.secondary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              mx: 'auto',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.secondary?.main || theme.palette.secondary.main, 0.3),
                filter: 'blur(12px)',
                position: 'absolute',
              }}
            />
            <AutoAwesome
              sx={{
                fontSize: 48,
                color: 'secondary.main',
                position: 'relative',
                zIndex: 1,
              }}
            />
          </Box>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 700,
            }}
          >
            Build Your Perfect Schedule
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              mb: 4,
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            Browse available courses, select your preferred sections, and let our AI optimize your
            timetable for the perfect balance
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            sx={{
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1,
                  fontWeight: 700,
                  color: 'primary.main',
                }}
              >
                1
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                }}
              >
                Browse
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1,
                  fontWeight: 700,
                  color: 'secondary.main',
                }}
              >
                2
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                }}
              >
                Select
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.secondary?.main || theme.palette.warning.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1,
                  fontWeight: 700,
                  color: 'secondary.main',
                }}
              >
                3
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                }}
              >
                Optimize
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => navigate('/courses')}
            startIcon={<ArrowForward />}
          >
            Browse Courses
          </Button>
        </Card>
      ) : (
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              <ScheduleOverview
                sections={schedule?.sections || []}
                courses={allCourses}
                aiAnalysis={aiAnalysis}
              />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PreferencesSummaryCard />
                </Grid>
                {hasCourses && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <OptimizationPanel
                      schedule={schedule}
                      optimizing={optimizing}
                      generating={generating}
                      generationProgress={generationProgress}
                      initProgress={initProgress}
                      error={error}
                      webllmAvailable={webllmAvailable}
                      onOptimize={handleOptimize}
                      onGenerateAll={handleGenerateAll}
                      onWebgpuWarning={() => setWebgpuWarningOpen(true)}
                    />
                  </Grid>
                )}
              </Grid>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <SelectedCoursesList
              sections={schedule?.sections || []}
              courses={allCourses}
              pinnedSectionIds={new Set(Object.values(profile?.pinnedSelections || {}))}
              onDeselect={(courseId) => {
                const prev = profile?.courseSelections || {};
                const updated = { ...prev };
                delete updated[courseId];
                updateProfile({ courseSelections: updated });
                const newSections = (schedule?.sections || []).filter(
                  (s) => s.courseId !== courseId,
                );
                setSchedule(
                  newSections.length > 0 ? { ...schedule!, sections: newSections } : null,
                );
              }}
              onUndoDeselect={(courseId, sectionId) => {
                const prev = profile?.courseSelections || {};
                updateProfile({ courseSelections: { ...prev, [courseId]: sectionId } });
                const section = allSections.find((s) => s.id === sectionId);
                if (section && schedule) {
                  setSchedule({ ...schedule, sections: [...schedule.sections, section] });
                } else if (section) {
                  setSchedule({
                    id: 'current',
                    name: 'Current Selection',
                    sections: [section],
                    totalCredits: 0,
                    score: 0,
                    conflicts: [],
                  });
                }
              }}
            />
          </Grid>
        </Grid>
      )}
      <Dialog open={webgpuWarningOpen} onClose={() => setWebgpuWarningOpen(false)}>
        <DialogTitle>AI Performance Notice</DialogTitle>
        <DialogContent>
          <Typography>
            For the best AI experience, we recommend using Chrome, Edge, or Firefox on a desktop
            computer. You can still proceed, but it may be slower.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebgpuWarningOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setWebgpuWarningOpen(false);
              handleOptimize();
            }}
          >
            Continue Anyway
          </Button>
        </DialogActions>
      </Dialog>
      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onClose={() => setApiKeyDialogOpen(false)}
        onSave={(key) => {
          updateLlmConfig({ ...llmConfig, apiKey: key });
          handleOptimize();
        }}
      />
      <Suspense fallback={null}>
        <ErrorBoundary>
          <ScheduleExplorerDialog
            open={scheduleExplorerOpen}
            onClose={() => setScheduleExplorerOpen(false)}
            generatedSchedules={generatedSchedules}
            selectedSchedule={selectedSchedule}
            onSelectSchedule={setSelectedSchedule}
            onApplySchedule={handleApplySchedule}
            courses={allCourses}
            allSections={allSections}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            showConflicting={showConflicting}
            onToggleConflicting={() => setShowConflicting(!showConflicting)}
            diagnostics={scheduleDiagnostics}
            prefilterSummary={prefilterSummary}
            onDiagnosticAction={(action) => {
              if (action.includes('Browse') || action.includes('Select')) {
                navigate('/courses');
              }
              setScheduleExplorerOpen(false);
            }}
          />
        </ErrorBoundary>
      </Suspense>
    </Box>
  );
}
