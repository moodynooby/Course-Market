import { CalendarToday, CloudUpload, Folder } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getSemesters } from '../../services/onboardingApi';
import { getSemesterData } from '../../services/coursesApi';
import type { Semester } from '../../types';

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

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const data = await getSemesters();
      setSemesters(data);
    } catch (err) {
      setError('Failed to load semesters. Please try again.');
      console.error('Error loading semesters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSemester = async (semesterId: string) => {
    try {
      setSelecting(semesterId);
      setError(null);

      // Verify the semester data is accessible
      await getSemesterData(semesterId);

      onComplete(semesterId);
    } catch (err) {
      setError(`Failed to load semester data. Please try again or contact support.`);
      console.error('Error loading semester data:', err);
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading available semesters...
        </Typography>
      </Box>
    );
  }

  if (semesters.length === 0) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          No semesters available yet. Please contact your administrator.
        </Alert>
      </Box>
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
            <Card
              sx={{
                height: '100%',
                cursor: selecting === semester.id ? 'wait' : 'pointer',
                border: selectedSemesterId === semester.id ? 2 : 1,
                borderColor: selectedSemesterId === semester.id ? 'accent.main' : 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 3,
                  borderColor: 'accent.main',
                },
              }}
              onClick={() => handleSelectSemester(semester.id)}
            >
              <CardContent>
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
                      <CircularProgress size={16} />
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
              </CardContent>
            </Card>
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
