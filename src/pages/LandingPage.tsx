import { AutoAwesome, Upload, ArrowForward, PlayArrow, Psychology } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CalendarView from '../components/CalendarView';
import { getCourses } from '../config/storageConfig';
import { STORAGE_KEYS } from '../config/userConfig';
import { getLlmConfig } from '../config/llmConfig';
import { checkConflicts } from '../utils/schedule';
import ImportDialog from '../components/ImportDialog';
import ApiKeyDialog from '../components/ApiKeyDialog';
import { useAuth } from '../hooks/useAuth';
import { saveLlmConfig } from '../config/llmConfig';
import type { Course, LLMConfig, Schedule, Section } from '../types';

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

export default function LandingPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [coursesImported, setCoursesImported] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  // Optimization States
  const [optimizing, setOptimizing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [webllmAvailable, setWebllmAvailable] = useState(false);
  const [initProgress, setInitProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [webgpuWarningOpen, setWebgpuWarningOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  useEffect(() => {
    const checkData = () => {
      const { courses, sections } = getCourses();
      setAllCourses(courses);
      setAllSections(sections);
      setCoursesImported(courses.length > 0);
      setSchedule(generateCurrentSchedule());
    };

    checkData();
    setWebllmAvailable('gpu' in navigator);

    const handleStorageChange = () => {
      checkData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [importOpen]);

  const handleOptimize = async () => {
    if (!schedule) {
      setError('No courses selected. Please select some courses first.');
      return;
    }

    const llmConfigObj = getLlmConfig();
    const isCloud = ['openai', 'anthropic', 'groq'].includes(llmConfigObj.provider);

    if (isCloud && !llmConfigObj.apiKey) {
      setApiKeyDialogOpen(true);
      return;
    }

    setOptimizing(true);
    setError('');
    setInitProgress('');

    try {
      const { optimizeWithLLM } = await import('../services/llm');
      const { getPreferences } = await import('../config/userConfig');
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

      const token = await getToken();
      const result = await optimizeWithLLM(
        [schedule],
        preferences,
        token,
        {
          provider: llmConfig.provider as 'webllm' | 'wllama' | 'openai' | 'anthropic' | 'groq',
          ...config,
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
        localStorage.setItem(STORAGE_KEYS.COURSE_SELECTIONS, JSON.stringify(selections));
        window.dispatchEvent(new Event('storage'));
      }

      setAiAnalysis(result.aiAnalysis || 'Schedule optimized successfully.');
    } catch (err) {
      setError(`Optimization failed: ${(err as Error).message}`);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <Box>
      <header style={{ marginBottom: '40px' }}>
        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to your centralized AuraIsHub control center.
        </Typography>
      </header>

      {!coursesImported ? (
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
            Your dashboard is empty because you haven't imported any courses yet. Download your
            courses CSV and import it to assemble your perfect schedule.
          </Typography>
          <Button
            variant="contained"
            color="accent"
            size="large"
            onClick={() => setImportOpen(true)}
            startIcon={<Upload />}
          >
            Import Courses CSV
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
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onClose={() => setApiKeyDialogOpen(false)}
        provider={getLlmConfig().provider}
        onSave={(key) => {
          const config = getLlmConfig();
          saveLlmConfig({ ...config, apiKey: key });
          handleOptimize();
        }}
      />
    </Box>
  );
}
