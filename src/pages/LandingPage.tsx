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
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiKeyDialog from '../components/ApiKeyDialog';
import { OptimizationPanel } from '../components/dashboard/OptimizationPanel';
import { ScheduleOverview } from '../components/dashboard/ScheduleOverview';
import { SelectedCoursesList } from '../components/dashboard/SelectedCoursesList';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { useConfigContext } from '../context/ConfigContext';
import { useAuth } from '../hooks/useAuth';
import { cacheSemesterData, getCachedSemesterData } from '../services/dbCache';
import type { Course, Schedule, Section } from '../types';
import { checkConflicts } from '../utils/schedule';
import type { GeneratedSchedule, SearchResult } from '../utils/schedule-types';

const ScheduleExplorerDialog = lazy(() =>
  import('../components/schedule-explorer/ScheduleExplorerDialog').then((module) => ({
    default: module.ScheduleExplorerDialog,
  })),
);

export default function LandingPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { preferences, llmConfig, updateLlmConfig } = useConfigContext();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [coursesImported, setCoursesImported] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);

  const [optimizing, setOptimizing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [webllmAvailable, setWebllmAvailable] = useState(false);
  const [initProgress, setInitProgress] = useState<string>('');
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
  const [searching, setSearching] = useState(false);
  const [showConflicting, setShowConflicting] = useState(false);

  const loadScheduleFromSelections = useCallback((courses: Course[], sections: Section[]) => {
    const selections = storage.get<Record<string, string>>(STORAGE_KEYS.COURSE_SELECTIONS, {});

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
  }, []);

  const loadData = useCallback(async () => {
    try {
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
        loadScheduleFromSelections(courses, sections);
      } else {
        const response = await fetch(activeSemester.jsonUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch semester JSON: ${response.status}`);
        }
        const semesterData = await response.json();

        const courses: Course[] = semesterData.courses || [];
        const sections: Section[] = semesterData.sections || [];

        await cacheSemesterData(semesterId, courses, sections, semesterData.version || '1.0');

        setAllCourses(courses);
        setAllSections(sections);
        loadScheduleFromSelections(courses, sections);
      }
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

    const handleStorageChange = () => {
      if (allCourses.length > 0 && allSections.length > 0) {
        loadScheduleFromSelections(allCourses, allSections);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [allCourses, allSections, loadScheduleFromSelections, loadData]);

  const handleOptimize = async () => {
    if (!schedule) {
      setError('No courses selected. Please select some courses first.');
      return;
    }

    setOptimizing(true);
    setError('');
    setInitProgress('');

    try {
      const { optimizeWithLLM } = await import('../services/llm');
      const token = await getToken();

      const result = await optimizeWithLLM(
        [schedule],
        preferences,
        token || '',
        {
          provider: llmConfig.provider as 'webllm' | 'groq',
          model: llmConfig.model,
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens,
          initProgressCallback: (report: { progress: number; text: string }) => {
            setInitProgress(`${report.text} (${Math.round(report.progress * 100)}%)`);
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
        storage.set(STORAGE_KEYS.COURSE_SELECTIONS, selections);
        window.dispatchEvent(new Event('storage'));
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

      const schedules = generateSchedules(allCourses, sectionsByCourse, prefs, {
        maxSchedules: 500,
        onProgress: setGenerationProgress,
      });

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
  }, [schedule, allCourses, allSections, preferences]);

  const handleApplySchedule = useCallback((genSchedule: GeneratedSchedule) => {
    const selections = genSchedule.sections.reduce(
      (acc: Record<string, string>, section: Section) => {
        acc[section.courseId] = section.id;
        return acc;
      },
      {} as Record<string, string>,
    );
    storage.set(STORAGE_KEYS.COURSE_SELECTIONS, selections);
    window.dispatchEvent(new Event('storage'));
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
  }, []);

  const handleNaturalSearch = useCallback(async () => {
    if (!searchQuery.trim() || generatedSchedules.length === 0) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { searchSchedulesByIntent } = await import('../utils/nlp-parser');
      const results = searchSchedulesByIntent(searchQuery, generatedSchedules);
      setSearchResults(results);
    } catch (err) {
      setError(`Search failed: ${(err as Error).message}`);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, generatedSchedules]);

  const hasCourses = schedule && schedule.sections.length > 0;
  const showOptimization = hasCourses;

  return (
    <Box>
      <Box component="header" sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to your centralized AuraIsHub control center
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
            bgcolor: 'surface.containerHigh',
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Loading semester data...
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
            bgcolor: 'surface.containerHigh',
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.accent?.main || theme.palette.secondary.main, 0.1),
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
                bgcolor: alpha(theme.palette.accent?.main || theme.palette.secondary.main, 0.3),
                filter: 'blur(12px)',
                position: 'absolute',
              }}
            />
            <AutoAwesome
              sx={{
                fontSize: 48,
                color: 'accent.main',
                position: 'relative',
                zIndex: 1,
              }}
            />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Build Your Perfect Schedule
          </Typography>
          <Typography color="text.secondary" mb={4} maxWidth={500} mx="auto">
            Browse available courses, select your preferred sections, and let our AI optimize your
            timetable for the perfect balance
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" mb={4}>
            <Box textAlign="center">
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
              <Typography variant="caption" color="text.secondary">
                Browse
              </Typography>
            </Box>
            <Box textAlign="center">
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
              <Typography variant="caption" color="text.secondary">
                Select
              </Typography>
            </Box>
            <Box textAlign="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.accent?.main || theme.palette.warning.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1,
                  fontWeight: 700,
                  color: 'accent.main',
                }}
              >
                3
              </Box>
              <Typography variant="caption" color="text.secondary">
                Optimize
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            color="accent"
            size="large"
            onClick={() => navigate('/courses')}
            startIcon={<ArrowForward />}
            sx={{
              borderRadius: 3,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            Browse Courses
          </Button>
        </Card>
      ) : (
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <ScheduleOverview
              sections={schedule?.sections || []}
              courses={allCourses}
              aiAnalysis={aiAnalysis}
            />
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3}>
              <SelectedCoursesList sections={schedule?.sections || []} courses={allCourses} />

              {showOptimization && (
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
              )}
            </Stack>
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
            color="accent"
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
        <ScheduleExplorerDialog
          open={scheduleExplorerOpen}
          onClose={() => setScheduleExplorerOpen(false)}
          generatedSchedules={generatedSchedules}
          selectedSchedule={selectedSchedule}
          onSelectSchedule={setSelectedSchedule}
          onApplySchedule={handleApplySchedule}
          courses={allCourses}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleNaturalSearch}
          searching={searching}
          searchResults={searchResults}
          showConflicting={showConflicting}
          onToggleConflicting={() => setShowConflicting(!showConflicting)}
        />
      </Suspense>
    </Box>
  );
}
