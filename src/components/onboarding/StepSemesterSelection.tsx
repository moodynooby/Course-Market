import { CalendarToday, CloudUpload, Folder } from '@mui/icons-material';
import { Alert, Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, LoadingState } from '../EmptyState';
import { InteractiveCard } from '../GlassAppBar';
import { getCoursesBySubject, getSemesterData, getSemesters } from '../../services/coursesApi';
import { getCachedSemesterData } from '../../services/dbCache';
import type { Course, Section, Semester } from '../../types';

interface StepSemesterSelectionProps {
  onComplete: (semesterId: string) => void;
  selectedSemesterId?: string;
}

export function StepSemesterSelection({
  onComplete,
  selectedSemesterId,
}: StepSemesterSelectionProps) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSemesters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSemesters();
      setSemesters(response.semesters);
    } catch (err) {
      setError('Failed to load semesters. Please try again.');
      console.error('[StepSemesterSelection] Error loading semesters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  const handleSelectSemester = async (semesterId: string) => {
    try {
      setSelecting(semesterId);
      setError(null);

      // Check cache first to avoid redundant fetch
      const cachedData = await getCachedSemesterData(semesterId);
      if (cachedData) {
        console.log('[StepSemesterSelection] Using cached semester data');
        onComplete(semesterId);
        return;
      }

      // Fetch fresh data if not cached
      const semesterData = await getSemesterData(semesterId);

      const coursesBySubject = getCoursesBySubject(semesterData);
      const allCourses: Course[] = Object.values(coursesBySubject).flat();

      const allSections: Section[] = semesterData.sections.map((s) => ({
        id: s.id,
        courseId: s.courseCode,
        sectionNumber: s.sectionNumber,
        instructor: s.instructor,
        timeSlots: s.timeSlots,
        capacity: s.capacity,
        enrolled: s.enrolled,
      }));

      // Cache the data for CoursesPage to use
      const { cacheSemesterData } = await import('../../services/dbCache');
      await cacheSemesterData(semesterId, allCourses, allSections, semesterData.version);

      onComplete(semesterId);
    } catch (err) {
      setError(`Failed to load semester data. Please try again or contact support.`);
      console.error('[StepSemesterSelection] Error loading semester data:', err);
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading available semesters..." />;
  }

  if (semesters.length === 0) {
    return (
      <EmptyState
        icon={<Folder sx={{ fontSize: 40 }} />}
        title="No semesters available"
        description="Please contact your administrator to add semester data"
        variant="compact"
      />
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Select Your Semester
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose the semester you want to optimize. This will load all available courses.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {semesters.map((semester) => (
          <Grid size={{ xs: 12, sm: 6 }} key={semester.id}>
            <InteractiveCard
              selected={selectedSemesterId === semester.id}
              disabled={selecting === semester.id}
              onClick={() => handleSelectSemester(semester.id)}
            >
              <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'accent.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'accent.main',
                    }}
                  >
                    {semester.jsonUrl ? (
                      <Folder fontSize="large" />
                    ) : (
                      <CloudUpload fontSize="large" />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {semester.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {semester.jsonUrl ? 'Ready to use' : 'Loading required'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1}>
                  {selecting === semester.id ? (
                    <>
                      <Box sx={{ width: 16, height: 16 }}>
                        <CircularProgress size={16} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Loading courses...
                      </Typography>
                    </>
                  ) : (
                    <>
                      <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Click to select
                      </Typography>
                    </>
                  )}
                </Stack>
              </Box>
            </InteractiveCard>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Note: Course data is loaded from our CDN for fast access. Your selections will be saved
          locally.
        </Typography>
      </Box>
    </Box>
  );
}
