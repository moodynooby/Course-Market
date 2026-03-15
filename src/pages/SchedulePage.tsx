import { PlayArrow, Psychology, Schedule as ScheduleIcon } from '@mui/icons-material';
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
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CalendarView from '../components/CalendarView';
import { getLlmConfig } from '../config/llmConfig';
import { getCourses } from '../config/storageConfig';
import { DEFAULT_PREFERENCES, getPreferences, STORAGE_KEYS } from '../config/userConfig';
import type { Course, LLMConfig, Schedule, Section } from '../types';
import { checkConflicts } from '../utils/schedule';

function generateCurrentSchedule(): Schedule | null {
  const { courses, sections } = getCourses();
  const saved = localStorage.getItem(STORAGE_KEYS.COURSE_SELECTIONS);

  if (!saved) return null;

  try {
    const selections = JSON.parse(saved);
    const selectedSections: Section[] = [];
    const courseIds = new Set(Object.keys(selections));

    courseIds.forEach((courseId) => {
      const sectionId = selections[courseId];
      const section = sections.find((s) => s.id === sectionId);
      if (section) selectedSections.push(section);
    });

    if (selectedSections.length === 0) return null;

    const totalCredits = selectedSections.reduce((sum, s) => {
      const course = courses.find((c) => c.id === s.courseId);
      return sum + (course?.credits || 3);
    }, 0);

    return {
      id: 'current',
      name: 'Current Selection',
      sections: selectedSections,
      totalCredits,
      score: 0,
      conflicts: [],
    };
  } catch {
    return null;
  }
}

export default function SchedulePage() {
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [webllmAvailable, setWebllmAvailable] = useState(false);
  const [initProgress, setInitProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const isMobile = useMediaQuery('(max-width:899px)');
  const [dismissedMobileWarning, setDismissedMobileWarning] = useState(false);
  const [webgpuWarningOpen, setWebgpuWarningOpen] = useState(false);

  const refreshSchedule = useCallback(() => {
    const schedule = generateCurrentSchedule();
    setCurrentSchedule(schedule);
    const { courses, sections } = getCourses();
    setAllCourses(courses);
    setAllSections(sections);
  }, []);

  useEffect(() => {
    refreshSchedule();
    setWebllmAvailable('gpu' in navigator);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.COURSE_SELECTIONS) {
        refreshSchedule();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSchedule();
      }
    };

    const handleFocus = () => {
      refreshSchedule();
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSchedule]);

  const handleOptimize = async () => {
    if (!currentSchedule) {
      setError('No courses selected. Please select some courses first.');
      return;
    }

    setOptimizing(true);
    setError('');
    setInitProgress('');

    try {
      const { optimizeWithLLM } = await import('../services/llm');
      const preferences = getPreferences();

      const llmConfig: LLMConfig = {
        ...getLlmConfig(),
        initProgressCallback: (report) => {
          setInitProgress(`${report.text} (${report.progress.toFixed(0)}%)`);
        },
      };

      const config: Record<string, unknown> = {
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens,
      };
      if (llmConfig.provider === 'wllama') {
        config.initProgressCallback = (progress: { loaded: number; total: number }) => {
          setInitProgress(
            `Downloading model... ${Math.round((progress.loaded / progress.total) * 100)}%`,
          );
        };
      }
      const result = await optimizeWithLLM(
        [currentSchedule],
        preferences,
        {
          provider: llmConfig.provider as 'webllm' | 'wllama' | 'openai' | 'anthropic' | 'custom',
          ...config,
        },
        allSections,
      );

      if (result.bestSchedule) {
        setCurrentSchedule(result.bestSchedule);
      }

      setAiAnalysis(result.aiAnalysis || 'Schedule optimized successfully.');
    } catch (err) {
      setError(`Optimization failed: ${(err as Error).message}`);
    } finally {
      setOptimizing(false);
    }
  };

  if (!currentSchedule) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Schedule Optimization
        </Typography>
        <Alert severity="info">
          No courses selected. Please select courses in the Courses section first.
        </Alert>
      </Box>
    );
  }

  const conflicts = checkConflicts(currentSchedule.sections);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Schedule Optimization
      </Typography>

      {conflicts.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Schedule conflicts detected: {conflicts.join(', ')}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Current Schedule
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    icon={<ScheduleIcon />}
                    label={`${currentSchedule.sections.length} sections`}
                    variant="outlined"
                  />
                  <Chip label={`${currentSchedule.totalCredits} credits`} variant="outlined" />
                  <Chip
                    label={`Score: ${currentSchedule.score}/100`}
                    color={currentSchedule.score > 70 ? 'success' : 'warning'}
                  />
                </Stack>
              </Stack>

              <CalendarView
                sections={currentSchedule.sections}
                courses={allCourses}
                conflicts={conflicts}
              />
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: '100%', lg: '400px' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                AI Optimization
              </Typography>

              <Stack spacing={2}>
                {isMobile && !dismissedMobileWarning && (
                  <Alert severity="warning" onClose={() => setDismissedMobileWarning(true)}>
                    For optimal performance, use a desktop computer for AI optimization.
                  </Alert>
                )}
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    if (!webllmAvailable) {
                      setWebgpuWarningOpen(true);
                    } else {
                      handleOptimize();
                    }
                  }}
                  disabled={optimizing}
                  startIcon={<PlayArrow />}
                  fullWidth
                >
                  {optimizing ? 'Optimizing...' : 'Optimize with AI'}
                </Button>

                {initProgress && (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(initProgress.match(/\d+/)?.[0] || '0')}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      {initProgress}
                    </Typography>
                  </Box>
                )}

                <Divider />

                {webllmAvailable ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Psychology color="primary" />
                    <Typography variant="body2">
                      AI optimized scheduling is ready to help!
                    </Typography>
                  </Stack>
                ) : (
                  <Alert severity="warning">
                    For the best AI experience, use Chrome, Edge, or Firefox on a desktop computer.
                  </Alert>
                )}

                {aiAnalysis && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      AI Analysis
                    </Typography>
                    <Box
                      sx={{
                        '& table': {
                          width: '100%',
                          borderCollapse: 'collapse',
                          mb: 2,
                        },
                        '& th, & td': {
                          border: '1px solid',
                          borderColor: 'divider',
                          px: 1,
                          py: 0.5,
                          textAlign: 'left',
                        },
                        '& th': {
                          bgcolor: 'action.hover',
                          fontWeight: 600,
                        },
                        '& ul, & ol': {
                          pl: 2,
                          mb: 1,
                        },
                        '& li': {
                          mb: 0.5,
                        },
                        '& p': {
                          mb: 1,
                        },
                        '& strong': {
                          fontWeight: 600,
                        },
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnalysis}</ReactMarkdown>
                    </Box>
                  </Box>
                )}

                {error && <Alert severity="error">{error}</Alert>}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>

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
            onClick={() => {
              setWebgpuWarningOpen(false);
              handleOptimize();
            }}
          >
            Continue Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
