import { School } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuthContext } from '../context/AuthContext';
import { getSemesters } from '../services/coursesApi';
import { getCachedSemesterData } from '../services/dbCache';
import type { Semester } from '../types';
import { transformSections } from '../utils/semester-transform';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateProfile, loading, signOut } = useAuthContext();

  const [phone, setPhone] = useState(profile?.phone || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>(profile?.semesterId || '');
  const [selectingSemester, setSelectingSemester] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSemesters = useCallback(async () => {
    try {
      setLoadingSemesters(true);
      const response = await getSemesters();
      setSemesters(response.semesters);
    } catch (err) {
      console.error('[Onboarding] Error loading semesters:', err);
    } finally {
      setLoadingSemesters(false);
    }
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (profile?.semesterId) {
      navigate('/', { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.semesterId) setSelectedSemester(profile.semesterId);
  }, [profile?.phone, profile?.semesterId]);

  const validatePhone = (value: string): boolean => {
    if (!value.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!/^[\d\s\-+()]+$/.test(value)) {
      setPhoneError('Invalid phone number format');
      return false;
    }
    if (value.replace(/\D/g, '').length < 10) {
      setPhoneError('Phone number must be at least 10 digits');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handleSelectSemester = async (semesterId: string) => {
    try {
      setSelectingSemester(semesterId);
      const cachedData = await getCachedSemesterData(semesterId);
      if (!cachedData) {
        const { cacheSemesterData } = await import('../services/dbCache');
        const { getSemesterData: fetchSemesterData } = await import('../services/coursesApi');
        const semesterData = await fetchSemesterData(semesterId);
        const { courses: allCourses, sections: allSections } = transformSections(
          semesterData.sections,
        );
        await cacheSemesterData(semesterId, allCourses, allSections);
      }
      setSelectedSemester(semesterId);
    } catch (err) {
      console.error('[Onboarding] Error loading semester data:', err);
    } finally {
      setSelectingSemester(null);
    }
  };

  const handleSave = async () => {
    if (!validatePhone(phone)) return;
    if (!selectedSemester) {
      setError('Please select a semester');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateProfile({ phone, semesterId: selectedSemester });
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save your details';
      setError(`${errorMessage}. Please try again or refresh the page.`);
      console.error('Error saving details:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Stack
          spacing={4}
          sx={{
            alignItems: 'center',
          }}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'secondary.main',
              }}
            >
              <School sx={{ fontSize: 36 }} />
            </Avatar>
            <Typography variant="h4">Welcome to AuraIsHub!</Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
              We need your phone number for trade contacts and your semester to load courses
            </Typography>
          </Stack>

          <Box sx={{ maxWidth: 800, mx: 'auto', width: '100%' }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                      Contact & Semester
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      We need your phone number for trade contacts and your semester to load courses
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    label="Phone Number"
                    type="tel"
                    placeholder="+(555) 123-4567"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) validatePhone(e.target.value);
                    }}
                    error={!!phoneError}
                    helperText={
                      phoneError || 'Used only for trade contacts — never shared publicly.'
                    }
                    required
                  />

                  <Box>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Semester
                    </Typography>

                    {loadingSemesters ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                        Loading semesters...
                      </Typography>
                    ) : semesters.length === 0 ? (
                      <Alert severity="warning">
                        No semesters available. Please contact your administrator.
                      </Alert>
                    ) : (
                      <Grid container spacing={2}>
                        {semesters.map((semester) => (
                          <Grid size={{ xs: 12, sm: 6 }} key={semester.id}>
                            <Card
                              onClick={() => handleSelectSemester(semester.id)}
                              variant="outlined"
                              sx={{
                                height: '100%',
                                cursor:
                                  selectingSemester === semester.id ? 'not-allowed' : 'pointer',
                                border: selectedSemester === semester.id ? 2 : 1,
                                borderColor:
                                  selectedSemester === semester.id ? 'secondary.main' : 'divider',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  borderColor: 'secondary.main',
                                },
                                ...(selectingSemester === semester.id && {
                                  opacity: 0.6,
                                }),
                              }}
                            >
                              <Box sx={{ p: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {semester.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {selectedSemester === semester.id
                                    ? 'Selected'
                                    : 'Click to select'}
                                </Typography>
                              </Box>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      onClick={handleSave}
                      disabled={saving || !phone.trim() || !selectedSemester}
                    >
                      {saving ? 'Saving...' : 'Save & Continue'}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
          <Button
            variant="text"
            color="inherit"
            onClick={() => signOut()}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Sign out
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
