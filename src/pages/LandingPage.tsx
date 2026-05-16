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
import { cacheSemesterData, getCachedSemesterData } from '../services/dbCache';
import { buildCourseIndex, searchSchedules } from '../services/search';
import type { Course, Schedule, Section, SemesterJSON } from '../types';
import { checkConflicts } from '../utils/schedule';
import type { ScheduleDiagnostics } from '../utils/schedule-diagnostics';
import { diagnoseEmptyGeneration } from '../utils/schedule-diagnostics';
import type { GeneratedSchedule, SearchResult } from '../utils/schedule-types';
import { DEFAULT_MAX_SCHEDULES } from '../utils/schedule-types';
import { transformSections } from '../utils/semester-transform';

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

      const { getSemesters } = await import('../services/coursesApi');
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

      const cachedData = await getCachedSemesterData(semesterId);

      if (cachedData?.courses && cachedData.sections) {
        const courses = cachedData.courses;
        const sections = cachedData.sections;
        setAllCourses(courses);
        setAllSections(sections);
        buildCourseIndex(courses, sections);
        loadScheduleFromSelections(courses, sections);
      } else {
        const response = await fetch(activeSemester.jsonUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch semester JSON: ${response.status}`);
        }
        const semesterData: SemesterJSON = await response.json();

        const { courses, sections } = transformSections(semesterData.sections);

        await cacheSemesterData(semesterId, courses, sections);

        setAllCourses(courses);
        setAllSections(sections);
        buildCourseIndex(courses, sections);
        loadScheduleFromSelections(courses, sections);
      }

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

    try {
      const { optimizeWithLLM } = await import('../services/llm');
      const { generateSchedules } = await import('../utils/schedule-generator');
      const token = await getToken();

      const selectedCourseIds = new Set(schedule.sections.map((s) => s.courseId));
      const relevantSections = allSections.filter((s) => selectedCourseIds.has(s.courseId));
      const sectionsByCourse = new Map<string, Section[]>();
      relevantSections.forEach((section) => {
        const existing = sectionsByCourse.get(section.courseId) || [];
        existing.push(section);
        sectionsByCourse.set(section.courseId, existing);
      });
      const pinnedSelections = profile?.pinnedSelections || {};
      Object.entries(pinnedSelections).forEach(([courseId, sectionId]) => {
        if (sectionsByCourse.has(courseId)) {
          const pinnedSection = allSections.find((s) => s.id === sectionId);
          if (pinnedSection) sectionsByCourse.set(courseId, [pinnedSection]);
        }
      });

      let candidates = generateSchedules(allCourses, sectionsByCourse, preferences, {
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

    try {
      const { generateSchedules } = await import('../utils/schedule-generator');
      const prefs = preferences;

      const selectedCourseIds = new Set(schedule.sections.map((s) => s.courseId));
      const relevantSections = allSections.filter((s) => selectedCourseIds.has(s.courseId));

      const sectionsByCourse = new Map<string, Section[]>();
      relevantSections.forEach((section) => {
        const existing = sectionsByCourse.get(section.courseId) || [];
        existing.push(section);
        sectionsByCourse.set(section.courseId, existing);
      });

      if (sectionsByCourse.size === 0) {
        setGeneratedSchedules([]);
        setGenerating(false);
        return;
      }

      const pinnedSelections = profile?.pinnedSelections || {};
      const pinnedMap = new Map(Object.entries(pinnedSelections));
      pinnedMap.forEach((sectionId, courseId) => {
        if (sectionsByCourse.has(courseId)) {
          const pinnedSection = allSections.find((s) => s.id === sectionId);
          if (pinnedSection) {
            sectionsByCourse.set(courseId, [pinnedSection]);
          }
        }
      });

      const schedules = generateSchedules(allCourses, sectionsByCourse, prefs, {
        maxSchedules: DEFAULT_MAX_SCHEDULES,
        onProgress: setGenerationProgress,
      });

      if (schedules.length === 0) {
        const diagnostics = diagnoseEmptyGeneration(allCourses, sectionsByCourse, prefs, pinnedMap);
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
  const showOptimization = hasCourses;

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
            borderRadius: 6, // rounded-xl per DESIGN.md
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
                {showOptimization && (
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
