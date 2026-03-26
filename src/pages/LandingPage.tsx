import {
  ArrowForward,
  AutoAwesome,
  Close,
  GridView,
  Psychology,
  Search,
  Star,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import ApiKeyDialog from '../components/ApiKeyDialog';
import CalendarView from '../components/CalendarView';
import { PreferencesForm } from '../components/PreferencesForm';
import { ENV } from '../config/devConfig';
import { getLlmConfig, saveLlmConfig } from '../config/llmConfig';
import { storage } from '../config/storage';
import { DEFAULT_PREFERENCES, STORAGE_KEYS, savePreferences } from '../config/userConfig';
import { useAuth } from '../hooks/useAuth';
import { cacheSemesterData, getCachedSemesterData } from '../services/dbCache';
import type { Course, Preferences, Schedule, Section } from '../types';
import { checkConflicts } from '../utils/schedule';
import { clusterSchedules } from '../utils/schedule-generator';
import type { GeneratedSchedule, SearchResult } from '../utils/schedule-types';

export default function LandingPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [coursesImported, setCoursesImported] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  const loadScheduleFromSelections = useCallback((courses: Course[], sections: Section[]) => {
    const selections = storage.get<Record<string, string>>(STORAGE_KEYS.COURSE_SELECTIONS, {});

    if (Object.keys(selections).length === 0) {
      setSchedule(null);
      setCoursesImported(courses.length > 0);
      return;
    }

    try {
      const selectedSections: Section[] = [];
      Object.entries(selections).forEach(([, sectionId]) => {
        const section = sections.find((s) => s.id === sectionId);
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
      // First, fetch available semesters from API
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

      // Find active semester or use first available
      const activeSemester = semesters.find((s) => s.isActive) || semesters[0];
      const semesterId = activeSemester.id;

      // Try to load from cache first
      const cachedData = await getCachedSemesterData(semesterId);

      if (cachedData && cachedData.courses && cachedData.sections) {
        // Cache hit - use cached data
        const courses = cachedData.courses;
        const sections = cachedData.sections;
        setAllCourses(courses);
        setAllSections(sections);
        loadScheduleFromSelections(courses, sections);
      } else {
        // Cache miss - fetch from CDN and cache
        const response = await fetch(activeSemester.jsonUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch semester JSON: ${response.status}`);
        }
        const semesterData = await response.json();

        const courses: Course[] = semesterData.courses || [];
        const sections: Section[] = semesterData.sections || [];

        // Cache the data for future use
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

  // Optimization States
  const [optimizing, setOptimizing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [webllmAvailable, setWebllmAvailable] = useState(false);
  const [initProgress, setInitProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [webgpuWarningOpen, setWebgpuWarningOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  // Schedule Explorer States
  const [scheduleExplorerOpen, setScheduleExplorerOpen] = useState(false);
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSchedule[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedSchedule, setSelectedSchedule] = useState<GeneratedSchedule | null>(null);
  const [explorerTab, setExplorerTab] = useState(0);
  const [showConflicting, setShowConflicting] = useState(false);

  // Natural Language Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [useLLMSearch, _setUseLLMSearch] = useState(false);

  useEffect(() => {
    loadData();
    setWebllmAvailable('gpu' in navigator);

    // Listen for storage changes (cross-tab and same-tab via custom events)
    const handleStorageChange = () => {
      // Reload selections from localStorage when courses change
      if (allCourses.length > 0 && allSections.length > 0) {
        loadScheduleFromSelections(allCourses, allSections);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const { getPreferences } = await import('../config/userConfig');
      const preferences = getPreferences();

      const currentLlmConfig = getLlmConfig();
      const token = await getToken();

      const result = await optimizeWithLLM(
        [schedule],
        preferences,
        token || '',
        {
          provider: currentLlmConfig.provider as 'webllm' | 'groq',
          model: currentLlmConfig.model,
          temperature: currentLlmConfig.temperature,
          maxTokens: currentLlmConfig.maxTokens,
          initProgressCallback: (report) => {
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
      const code = error.code;
      if (code === 'KEY_REQUIRED') {
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
      const { getPreferences } = await import('../config/userConfig');
      const prefs = getPreferences();

      const selectedCourseIds = new Set(schedule.sections.map((s) => s.courseId));
      const relevantSections = allSections.filter((s) => selectedCourseIds.has(s.courseId));

      // Build sectionsByCourse map for generateSchedules
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
  }, [schedule, allCourses, allSections]);

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
      // Use rule-based search by default (faster, no API cost)
      const { searchSchedulesByIntent } = await import('../utils/nlp-parser');
      const results = searchSchedulesByIntent(searchQuery, generatedSchedules);

      setSearchResults(results);

      // Optional: Use LLM for enhanced search (slower, may cost API credits)
      if (useLLMSearch) {
        try {
          const { searchSchedulesNatural } = await import('../services/llm');
          const { getPreferences } = await import('../config/userConfig');
          const prefs = getPreferences();
          const token = await getToken();

          if (token) {
            const llmResults = await searchSchedulesNatural(
              searchQuery,
              generatedSchedules.slice(0, 20), // Limit for LLM processing
              prefs,
            );
            // Merge LLM results with rule-based (LLM takes priority for top results)
            if (llmResults.length > 0) {
              setSearchResults(
                llmResults.map((r) => ({
                  schedule: r.schedule,
                  relevanceScore: r.relevanceScore,
                  matchedCriteria: r.matchedCriteria,
                  explanation: r.explanation,
                })),
              );
            }
          }
        } catch (err) {
          if (ENV.IS_DEV) {
            console.error('LLM search failed, using rule-based:', err);
          }
          // Keep rule-based results as fallback
        }
      }
    } catch (err) {
      setError(`Search failed: ${(err as Error).message}`);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, generatedSchedules, useLLMSearch, getToken]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const conflictFreeSchedules = useMemo(() => {
    return generatedSchedules.filter((s) => s.conflicts.length === 0);
  }, [generatedSchedules]);

  // Use search results if available, otherwise use display schedules
  const activeSchedules = useMemo(() => {
    if (searchResults.length > 0) {
      return searchResults.map((r) => r.schedule);
    }
    const filtered = showConflicting ? generatedSchedules : conflictFreeSchedules;
    return [...filtered].sort((a, b) => b.score - a.score);
  }, [searchResults, generatedSchedules, conflictFreeSchedules, showConflicting]);

  const conflictingSchedules = useMemo(() => {
    return generatedSchedules.filter((s) => s.conflicts.length > 0);
  }, [generatedSchedules]);

  // Use the utility clustering function instead of inline implementation
  const clusteredSchedules = useMemo(() => {
    if (activeSchedules.length === 0) return [];
    // When searching, cluster search results; otherwise cluster display schedules
    const schedulesToCluster =
      searchResults.length > 0 ? searchResults.map((r) => r.schedule) : activeSchedules;
    return clusterSchedules(schedulesToCluster, 5);
  }, [activeSchedules, searchResults]);

  return (
    <Box>
      <Box component="header" sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to your centralized AuraIsHub control center.
        </Typography>
      </Box>

      {loading ? (
        <Card
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            mb: 4,
          }}
        >
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading semester data...
          </Typography>
        </Card>
      ) : !coursesImported ? (
        <Card
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            mb: 4,
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: 'divider',
          }}
        >
          <AutoAwesome sx={{ fontSize: 48, color: 'accent.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Ready to get started?
          </Typography>
          <Typography color="text.secondary" mb={4} maxWidth={600} mx="auto">
            Start by browsing and selecting courses from your semester to build your perfect
            schedule.
          </Typography>
          <Button
            variant="contained"
            color="accent"
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
            <Stack spacing={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={3}>
                    Your Schedule Overview
                  </Typography>
                  {schedule && schedule.sections.length > 0 ? (
                    <Box sx={{ height: 600 }}>
                      <CalendarView
                        sections={schedule.sections}
                        courses={allCourses}
                        conflicts={checkConflicts(schedule.sections)}
                      />
                    </Box>
                  ) : (
                    <Alert
                      severity="info"
                      action={
                        <Button color="inherit" size="small" onClick={() => navigate('/courses')}>
                          Browse Courses
                        </Button>
                      }
                    >
                      No courses selected yet. Head to the Course Browser to pick your sections.
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {aiAnalysis && (
                <Card sx={{ bgcolor: 'action.hover' }}>
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      fontWeight={800}
                      color="accent.main"
                    >
                      <AutoAwesome fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      AI Optimization Report
                    </Typography>
                    <Box
                      sx={{
                        '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
                        '& th, & td': {
                          border: '1px solid',
                          borderColor: 'divider',
                          px: 1,
                          py: 0.5,
                          textAlign: 'left',
                        },
                        '& th': { bgcolor: 'action.hover', fontWeight: 600 },
                        '& ul, & ol': { pl: 2, mb: 1 },
                        '& li': { mb: 0.5 },
                        '& p': { mb: 1, fontSize: '0.875rem' },
                        '& strong': { fontWeight: 600 },
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnalysis}</ReactMarkdown>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    Selected Courses
                  </Typography>
                  {schedule && schedule.sections.length > 0 ? (
                    <Stack spacing={2}>
                      {schedule.sections.map((section) => {
                        const course = allCourses.find((c) => c.id === section.courseId);
                        return (
                          <Box
                            key={section.id}
                            p={2}
                            sx={{ bgcolor: 'action.hover', borderRadius: 2 }}
                          >
                            <Typography variant="subtitle2" fontWeight={600}>
                              {course?.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {course?.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              color="accent.main"
                              mt={0.5}
                              display="inline-block"
                            >
                              Section {section.sectionNumber}
                            </Typography>
                          </Box>
                        );
                      })}
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/courses')}
                        endIcon={<ArrowForward />}
                      >
                        Manage Courses
                      </Button>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      0 courses selected.
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card
                sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    Course Optimization
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Use AI to automatically synthesize your selected courses into the perfect
                    conflict-free timetable.
                  </Typography>

                  <Stack spacing={2}>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => {
                        if (!webllmAvailable) {
                          setWebgpuWarningOpen(true);
                        } else {
                          handleOptimize();
                        }
                      }}
                      disabled={optimizing}
                      startIcon={<Psychology />}
                      fullWidth
                    >
                      {optimizing ? 'Optimizing Schedule...' : 'Optimize with AI'}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={handleGenerateAll}
                      disabled={generating || !schedule}
                      startIcon={<GridView />}
                      fullWidth
                    >
                      {generating
                        ? `Generating... (${generationProgress})`
                        : `View All Alternatives${schedule ? ` (${schedule.sections.length} courses)` : ''}`}
                    </Button>

                    {initProgress && (
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={parseFloat(initProgress.match(/\d+/)?.[0] || '0')}
                          sx={{ height: 6, borderRadius: 3, mb: 1 }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          align="center"
                          display="block"
                        >
                          {initProgress}
                        </Typography>
                      </Box>
                    )}

                    {error && <Alert severity="error">{error}</Alert>}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <PreferencesForm
                    preferences={preferences}
                    onUpdate={(key, value) => {
                      const updated = { ...preferences, [key]: value };
                      setPreferences(updated);
                      savePreferences(updated);
                    }}
                  />
                </CardContent>
              </Card>
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
          const config = getLlmConfig();
          saveLlmConfig({ ...config, apiKey: key });
          handleOptimize();
        }}
      />

      <Dialog
        open={scheduleExplorerOpen}
        onClose={() => setScheduleExplorerOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <GridView />
                <Typography variant="h6" fontWeight={700}>
                  Schedule Explorer
                </Typography>
                <Chip
                  label={`${activeSchedules.length} schedules`}
                  size="small"
                  color={activeSchedules.length > 0 ? 'success' : 'default'}
                />
                {conflictingSchedules.length > 0 && (
                  <Chip
                    label={`${conflictingSchedules.length} conflicts`}
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => setShowConflicting(!showConflicting)}
                    sx={{ cursor: 'pointer' }}
                  />
                )}
              </Stack>
              <IconButton onClick={() => setScheduleExplorerOpen(false)}>
                <Close />
              </IconButton>
            </Stack>

            {/* Natural Language Search Bar */}
            <TextField
              fullWidth
              size="small"
              placeholder='Try: "morning classes on MWF" or "no Friday classes" or "after 10am"'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNaturalSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {searchQuery ? (
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        edge="end"
                        sx={{ mr: 0.5 }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton
                        onClick={handleNaturalSearch}
                        edge="end"
                        disabled={!searchQuery.trim()}
                      >
                        <Search />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
            />

            {searching && (
              <Typography variant="caption" color="text.secondary">
                Searching schedules...
              </Typography>
            )}
            {searchResults.length > 0 && !searching && (
              <Typography variant="caption" color="text.secondary">
                Found {searchResults.length} matching schedule
                {searchResults.length !== 1 ? 's' : ''}
                {useLLMSearch ? ' (LLM-enhanced)' : ''}
              </Typography>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {activeSchedules.length === 0 && !generating && !searching ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {generatedSchedules.length === 0
                  ? 'No schedules generated yet.'
                  : 'No viable schedules found. Try adjusting your preferences or course selections.'}
              </Typography>
            </Box>
          ) : (
            <Grid container sx={{ height: '100%' }}>
              <Grid
                size={{ xs: 12, md: 5 }}
                sx={{ borderRight: 1, borderColor: 'divider', overflow: 'auto' }}
              >
                <Tabs
                  value={explorerTab}
                  onChange={(_, v) => setExplorerTab(v)}
                  variant="fullWidth"
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab label="All" />
                  {clusteredSchedules.length > 0 && <Tab label="Grouped" />}
                </Tabs>

                {explorerTab === 0 && (
                  <Stack spacing={1} p={2}>
                    {searchResults.length > 0
                      ? // Show search results with relevance
                        searchResults.slice(0, 50).map((result, idx) => {
                          const genSched = result.schedule;
                          return (
                            <Card
                              key={genSched.id}
                              sx={{
                                cursor: 'pointer',
                                border: selectedSchedule?.id === genSched.id ? 2 : 1,
                                borderColor:
                                  selectedSchedule?.id === genSched.id ? 'primary.main' : 'divider',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                              onClick={() => setSelectedSchedule(genSched)}
                            >
                              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  spacing={1}
                                >
                                  <Stack spacing={0.5} sx={{ flex: 1 }}>
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={1}
                                      justifyContent="space-between"
                                    >
                                      <Stack direction="row" alignItems="center" spacing={1}>
                                        {idx === 0 && (
                                          <Star sx={{ color: 'warning.main', fontSize: 16 }} />
                                        )}
                                        <Typography variant="body2" fontWeight={600}>
                                          {genSched.totalCredits} credits
                                        </Typography>
                                      </Stack>
                                      <Chip
                                        label={`Match: ${Math.round(result.relevanceScore * 100)}%`}
                                        size="small"
                                        color={
                                          result.relevanceScore >= 0.8
                                            ? 'success'
                                            : result.relevanceScore >= 0.6
                                              ? 'warning'
                                              : 'default'
                                        }
                                      />
                                    </Stack>
                                    {result.explanation && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {result.explanation}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Stack>
                              </CardContent>
                            </Card>
                          );
                        })
                      : // Show all schedules when no search
                        activeSchedules.slice(0, 50).map((genSched, idx) => (
                          <Card
                            key={genSched.id}
                            sx={{
                              cursor: 'pointer',
                              border: selectedSchedule?.id === genSched.id ? 2 : 1,
                              borderColor:
                                selectedSchedule?.id === genSched.id ? 'primary.main' : 'divider',
                              transition: 'all 0.2s',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                            onClick={() => setSelectedSchedule(genSched)}
                          >
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                              >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  {idx === 0 && (
                                    <Star sx={{ color: 'warning.main', fontSize: 16 }} />
                                  )}
                                  <Typography variant="body2" fontWeight={600}>
                                    {genSched.totalCredits} credits
                                  </Typography>
                                </Stack>
                                <Chip
                                  label={`Score: ${genSched.score}`}
                                  size="small"
                                  color={
                                    genSched.score >= 80
                                      ? 'success'
                                      : genSched.score >= 60
                                        ? 'warning'
                                        : 'error'
                                  }
                                />
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {genSched.sections.length} courses
                              </Typography>
                            </CardContent>
                          </Card>
                        ))}
                  </Stack>
                )}

                {explorerTab === 1 && clusteredSchedules.length > 0 && (
                  <Stack spacing={2} p={2}>
                    {clusteredSchedules.map((cluster, cIdx) => (
                      <Box key={cIdx}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1}>
                          {cluster.label} ({cluster.schedules.length})
                        </Typography>
                        <Stack spacing={1}>
                          {cluster.schedules.slice(0, 5).map((genSched) => (
                            <Card
                              key={genSched.id}
                              sx={{
                                cursor: 'pointer',
                                border: selectedSchedule?.id === genSched.id ? 2 : 1,
                                borderColor:
                                  selectedSchedule?.id === genSched.id ? 'primary.main' : 'divider',
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                              onClick={() => setSelectedSchedule(genSched)}
                            >
                              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="space-between"
                                >
                                  <Typography variant="body2">
                                    {genSched.totalCredits} credits
                                  </Typography>
                                  <Chip
                                    label={genSched.score}
                                    size="small"
                                    color={genSched.score >= 80 ? 'success' : 'default'}
                                  />
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 7 }} sx={{ overflow: 'auto' }}>
                {selectedSchedule ? (
                  <Stack spacing={2} p={3}>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                        <Typography variant="h6" fontWeight={700}>
                          Schedule Details
                        </Typography>
                        <Chip
                          label={`Score: ${selectedSchedule.score}`}
                          color={selectedSchedule.score >= 80 ? 'success' : 'default'}
                        />
                        <Chip
                          label={`${selectedSchedule.totalCredits} Credits`}
                          variant="outlined"
                        />
                      </Stack>

                      <Box sx={{ height: 400, mb: 2 }}>
                        <CalendarView
                          sections={selectedSchedule.sections}
                          courses={allCourses}
                          conflicts={selectedSchedule.conflicts}
                        />
                      </Box>

                      <Typography variant="subtitle2" fontWeight={700} mb={1}>
                        Courses
                      </Typography>
                      <Stack spacing={1}>
                        {selectedSchedule.sections.map((section: Section) => {
                          const course = allCourses.find((c: Course) => c.id === section.courseId);
                          return (
                            <Box
                              key={section.id}
                              sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}
                            >
                              <Typography variant="body2" fontWeight={600}>
                                {course?.code} - Section {section.sectionNumber}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {course?.name} | {section.instructor || 'TBA'}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>

                      {selectedSchedule.conflicts.length > 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="subtitle2">Conflicts:</Typography>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {selectedSchedule.conflicts.map((c: string, i: number) => (
                              <li key={i}>
                                <Typography variant="caption">{c}</Typography>
                              </li>
                            ))}
                          </ul>
                        </Alert>
                      )}

                      <Button
                        variant="contained"
                        color="accent"
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() => handleApplySchedule(selectedSchedule)}
                      >
                        Apply This Schedule
                      </Button>
                    </Box>
                  </Stack>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      Select a schedule from the list to view details
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
