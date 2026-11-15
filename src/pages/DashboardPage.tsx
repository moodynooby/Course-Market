import { Tune } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyDashboardState } from '../components/dashboard/EmptyDashboardState';
import { OptimizationPanel } from '../components/dashboard/OptimizationPanel';
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
        <Button
          variant="outlined"
          size="small"
          startIcon={<Tune />}
          onClick={() => setPrefsOpen(true)}
          sx={{ borderRadius: 2, fontWeight: 600, flexShrink: 0 }}
        >
          Preferences
        </Button>
      </Box>
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
              {coursesSelected && (
                <OptimizationPanel
                  schedule={schedule}
                  optimizing={generation.optimizing}
                  generating={generation.generating}
                  generationProgress={generation.generationProgress}
                  error={generation.error}
                  onOptimize={generation.handleOptimize}
                  onGenerateAll={generation.handleGenerateAll}
                />
              )}
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
