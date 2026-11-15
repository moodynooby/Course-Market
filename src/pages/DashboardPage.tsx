import { AutoAwesome, GridView, Tune, Undo } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyDashboardState } from '../components/dashboard/EmptyDashboardState';
import { PreferencesDialog } from '../components/dashboard/PreferencesDialog';
import { ScheduleOverview } from '../components/dashboard/ScheduleOverview';
import { SelectedCoursesList } from '../components/dashboard/SelectedCoursesList';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuthContext } from '../context/AuthContext';
import { useConfigContext } from '../context/ConfigContext';
import { useCourseSelection } from '../context/CourseSelectionContext';
import { useThemeMode } from '../context/ThemeContext';
import { useScheduleGeneration } from '../hooks/useScheduleGeneration';

const ScheduleExplorerDialog = lazy(() =>
  import('../components/schedule-explorer/ScheduleExplorerDialog').then((module) => ({
    default: module.ScheduleExplorerDialog,
  })),
);

function DashboardSkeleton() {
  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={3}>
          <Card variant="outlined" sx={{ borderRadius: 4, p: 3 }}>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="rectangular" height={180} sx={{ mt: 2, borderRadius: 2 }} />
          </Card>
          <Card variant="outlined" sx={{ borderRadius: 4, p: 3 }}>
            <Skeleton variant="text" width="30%" height={28} />
            <Skeleton variant="rectangular" height={120} sx={{ mt: 2, borderRadius: 2 }} />
          </Card>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card variant="outlined" sx={{ borderRadius: 4, p: 3 }}>
          <Skeleton variant="text" width="50%" height={28} />
          {[1, 2, 3].map((i) => (
            <CardContent key={i} sx={{ px: 0 }}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </CardContent>
          ))}
        </Card>
      </Grid>
    </Grid>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { profile } = useAuthContext();
  const { preferences, updatePreferences } = useConfigContext();
  const { mode, setMode } = useThemeMode();

  const {
    loading,
    coursesImported,
    schedule,
    courses: allCourses,
    sections: allSections,
    deselectCourse,
    selectSection,
    applySchedule,
  } = useCourseSelection();

  const generation = useScheduleGeneration({
    schedule,
    allCourses,
    allSections,
    applySchedule,
  });

  useEffect(() => {
    if (profile?.preferences?.theme && profile.preferences.theme !== mode) {
      setMode(profile.preferences.theme);
    }
  }, [profile, mode, setMode]);

  const handleDeselect = useCallback(
    (courseId: string) => {
      deselectCourse(courseId);
    },
    [deselectCourse],
  );

  const handleUndoDeselect = useCallback(
    (courseId: string, sectionId: string) => {
      selectSection(courseId, sectionId);
    },
    [selectSection],
  );

  const coursesSelected = Boolean(schedule && schedule.sections.length > 0);

  return (
    <Box>
      <Box
        component="header"
        sx={{
          mb: 4,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Review your schedule, browse courses, and optimize your timetable.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip
            title={
              !coursesSelected
                ? 'Select courses below to explore alternative timetables'
                : 'Explore all conflict-free timetable alternatives'
            }
            arrow
          >
            <span>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={
                  generation.generating ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <GridView />
                  )
                }
                disabled={generation.generating || !coursesSelected}
                onClick={generation.handleGenerateAll}
                aria-busy={generation.generating}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 700,
                  boxShadow: '0 3px 0 #028ce0',
                  '&:active': {
                    transform: 'translateY(2px)',
                    boxShadow: '0 1px 0 #027bc4',
                  },
                }}
              >
                {generation.generating
                  ? `Generating (${generation.generationProgress}%)`
                  : 'Explore Alternatives'}
              </Button>
            </span>
          </Tooltip>

          <Tooltip
            title={
              !coursesSelected
                ? 'Select courses below to auto-optimize timetable'
                : 'Automatically resolve conflicts and find the best timetable matching your preferences'
            }
            arrow
          >
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  generation.optimizing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <AutoAwesome />
                  )
                }
                disabled={generation.optimizing || !coursesSelected}
                onClick={generation.handleOptimize}
                aria-busy={generation.optimizing}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 600,
                  borderWidth: '2px',
                  '&:hover': { borderWidth: '2px' },
                }}
              >
                {generation.optimizing ? 'Optimizing Schedule...' : 'Auto-Optimize Schedule'}
              </Button>
            </span>
          </Tooltip>

          {generation.previousSchedule && (
            <Button
              variant="text"
              size="small"
              startIcon={<Undo />}
              onClick={generation.handleUndoOptimize}
              sx={{ borderRadius: '12px', fontWeight: 600 }}
            >
              Undo
            </Button>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<Tune />}
            onClick={() => setPrefsOpen(true)}
            sx={{
              borderRadius: '12px',
              fontWeight: 600,
              flexShrink: 0,
              borderWidth: '2px',
              '&:hover': { borderWidth: '2px' },
            }}
          >
            Preferences
          </Button>
        </Stack>
      </Box>
      {generation.generating && (
        <Box sx={{ width: '100%', mb: 3 }} role="status" aria-live="polite">
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Analyzing timetable combinations...
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>
              {generation.generationProgress}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={generation.generationProgress}
            color="secondary"
            sx={{ borderRadius: '6px', height: 6 }}
          />
        </Box>
      )}
      {generation.error && (
        <Alert
          severity="error"
          variant="outlined"
          onClose={generation.clearError}
          role="alert"
          sx={{ mb: 3, borderRadius: '12px' }}
        >
          {generation.error}
        </Alert>
      )}
      {loading ? (
        <DashboardSkeleton />
      ) : !coursesImported ? (
        <EmptyDashboardState />
      ) : (
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              <ScheduleOverview sections={schedule?.sections || []} courses={allCourses} />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3}>
              <SelectedCoursesList
                sections={schedule?.sections || []}
                courses={allCourses}
                pinnedSectionIds={new Set(Object.values(profile?.pinnedSelections || {}))}
                onDeselect={handleDeselect}
                onUndoDeselect={handleUndoDeselect}
              />
            </Stack>
          </Grid>
        </Grid>
      )}
      <Suspense fallback={null}>
        <ErrorBoundary>
          <ScheduleExplorerDialog
            open={generation.scheduleExplorerOpen}
            onClose={() => generation.setScheduleExplorerOpen(false)}
            generatedSchedules={generation.generatedSchedules}
            selectedSchedule={generation.selectedSchedule}
            onSelectSchedule={generation.setSelectedSchedule}
            onApplySchedule={generation.handleApplySchedule}
            courses={allCourses}
            allSections={allSections}
            searchQuery={generation.searchQuery}
            onSearchChange={generation.setSearchQuery}
            searchResults={generation.searchResults}
            showConflicting={generation.showConflicting}
            onToggleConflicting={() => generation.setShowConflicting(!generation.showConflicting)}
            diagnostics={generation.scheduleDiagnostics}
            prefilterSummary={generation.prefilterSummary}
            onDiagnosticAction={(action) => {
              if (action.includes('Browse') || action.includes('Select')) {
                navigate('/courses');
              }
              generation.setScheduleExplorerOpen(false);
            }}
          />
        </ErrorBoundary>
      </Suspense>
      <PreferencesDialog
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        initialPreferences={profile?.preferences || preferences}
        onSave={updatePreferences}
      />
    </Box>
  );
}
