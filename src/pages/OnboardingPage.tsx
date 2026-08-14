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
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuthContext } from '../context/AuthContext';
import { getSemesters } from '../services/coursesApi';
import type { Semester } from '../types';

/**
 * Progressive, skippable onboarding.
 *
 * The semester is the only required step (everything else needs it to load
 * courses), and it defaults to the most recent active semester. The phone
 * number is optional and asked inline here only for convenience — it can also
 * be supplied later directly inside the trade form. Skipping always lands the
 * user on the page they were trying to reach, so the first meaningful action
 * (building a schedule) is never blocked.
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateProfile, loading, signOut } = useAuthContext();

  const [phone, setPhone] = useState(profile?.phone || '');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>(profile?.semesterId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSemesters = useCallback(async () => {
    try {
      setLoadingSemesters(true);
      const response = await getSemesters();
      setSemesters(response.semesters);
      // Smart default: preselect the newest active semester.
      if (!selectedSemester && response.semesters.length > 0) {
        setSelectedSemester(response.semesters[0].id);
      }
    } catch (err) {
      console.error('[Onboarding] Error loading semesters:', err);
    } finally {
      setLoadingSemesters(false);
    }
  }, [selectedSemester]);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  const initialRedirectChecked = useRef(false);
  useEffect(() => {
    if (initialRedirectChecked.current) return;
    if (loading) return;
    initialRedirectChecked.current = true;
    if (profile?.semesterId) {
      navigate('/', { replace: true });
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.semesterId) setSelectedSemester(profile.semesterId);
  }, [profile?.phone, profile?.semesterId]);

  const handleSelectSemester = (semesterId: string) => {
    setSelectedSemester(semesterId);
  };

  const handleSave = async () => {
    if (!selectedSemester) {
      setError('Please select a semester');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateProfile({ semesterId: selectedSemester, ...(phone.trim() ? { phone } : {}) });
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

  /** Skip onboarding entirely; the user can set the semester later. */
  const handleSkip = () => {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
    navigate(from, { replace: true });
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
              Pick your semester to load this term's courses — you can change it anytime.
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
                      Which semester are you planning for?
                    </Typography>
                  </Box>

                  <Box>
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
                                cursor: 'pointer',
                                border: selectedSemester === semester.id ? 2 : 1,
                                borderColor:
                                  selectedSemester === semester.id ? 'secondary.main' : 'divider',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  borderColor: 'secondary.main',
                                },
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

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={handleSkip}
                      disabled={saving}
                      sx={{ textTransform: 'none', color: 'text.secondary' }}
                    >
                      Skip for now
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      onClick={handleSave}
                      disabled={saving || !selectedSemester}
                    >
                      {saving ? 'Saving...' : 'Continue'}
                    </Button>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', textAlign: 'center' }}
                  >
                    Your phone number is optional — add it later in the trade form when you want
                    other students to reach you.
                  </Typography>
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
