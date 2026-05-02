import { Check, ChevronLeft, School } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  MobileStepper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  stepClasses,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SchedulePreferences } from '../components/SchedulePreferences';
import { useAuthContext } from '../context/AuthContext';
import { getSemesters } from '../services/coursesApi';
import { getCachedSemesterData } from '../services/dbCache';
import type { Preferences, Semester } from '../types';

export type OnboardingStep = 'details' | 'preferences';

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'preferences', label: 'Preferences' },
];

function OnboardingWizard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuthContext();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getStartingStep = (): OnboardingStep => {
    if (profile?.semesterId) return 'preferences';
    return 'details';
  };

  const [activeStep, setActiveStep] = useState<OnboardingStep>(getStartingStep());
  const [error, setError] = useState<string | null>(null);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  // Phone + semester state
  const [phone, setPhone] = useState(profile?.phone || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>(profile?.semesterId || '');
  const [selectingSemester, setSelectingSemester] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleSaveDetails = async () => {
    if (!validatePhone(phone)) return;
    if (!selectedSemester) {
      setError('Please select a semester');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateProfile({ phone, semesterId: selectedSemester });
      setActiveStep('preferences');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save your details';
      setError(`${errorMessage}. Please try again or refresh the page.`);
      console.error('Error saving details:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSemester = async (semesterId: string) => {
    try {
      setSelectingSemester(semesterId);
      const cachedData = await getCachedSemesterData(semesterId);
      if (!cachedData) {
        const { cacheSemesterData } = await import('../services/dbCache');
        const { getSemesterData: fetchSemesterData, getCoursesBySubject } = await import(
          '../services/coursesApi'
        );
        const semesterData = await fetchSemesterData(semesterId);
        const coursesBySubject = getCoursesBySubject(semesterData);
        const allCourses = Object.values(coursesBySubject).flat();
        const allSections = semesterData.sections.map((s) => ({
          id: s.id,
          courseId: s.courseCode,
          sectionNumber: s.sectionNumber,
          instructor: s.instructor,
          timeSlots: s.timeSlots,
          capacity: s.capacity,
          enrolled: s.enrolled,
        }));
        await cacheSemesterData(semesterId, allCourses, allSections, semesterData.version);
      }
      setSelectedSemester(semesterId);
    } catch (err) {
      console.error('[Onboarding] Error loading semester data:', err);
    } finally {
      setSelectingSemester(null);
    }
  };

  const handlePreferencesSave = async (preferences: Preferences) => {
    try {
      setError(null);
      await updateProfile({ preferences });
      setPreferencesSaved(true);
    } catch (err) {
      setError('Failed to save preferences. Please try again.');
      console.error('Error saving preferences:', err);
      setPreferencesSaved(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    navigate('/');
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeStep);

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setActiveStep(STEPS[prevIndex].id);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', width: '100%' }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3, pb: 0 }}>
          {isMobile ? (
            <MobileStepper
              variant="progress"
              steps={STEPS.length}
              position="static"
              activeStep={currentStepIndex}
              nextButton={null}
              backButton={null}
              sx={{
                background: 'transparent',
                p: 0,
                '& .MuiLinearProgress-root': {
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                },
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'secondary.main',
                  borderRadius: 3,
                },
              }}
            />
          ) : (
            <Stepper
              activeStep={currentStepIndex}
              sx={{
                [`& .${stepClasses.completed}`]: {
                  color: 'secondary.main',
                },
                [`& .${stepClasses.root}`]: {
                  '&:last-child $': {
                    marginRight: 0,
                  },
                },
              }}
            >
              {STEPS.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;

                return (
                  <Step key={step.id}>
                    <StepLabel
                      slots={{
                        stepIcon: ({ completed }) =>
                          completed || isCompleted ? (
                            <Check
                              sx={{
                                fontSize: 16,
                                strokeWidth: 3,
                              }}
                            />
                          ) : isActive ? (
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: 'secondary.main',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                border: '2px solid',
                                borderColor: 'divider',
                              }}
                            />
                          ),
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        color={isActive ? 'text.primary' : 'text.secondary'}
                        sx={{
                          fontWeight: isActive ? 700 : 600,
                        }}
                      >
                        {step.label}
                      </Typography>
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          )}
        </Box>

        <CardContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ minHeight: 400 }}>
            {activeStep === 'details' && (
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
                  helperText={phoneError || "We'll keep it safe"}
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
                              cursor: selectingSemester === semester.id ? 'not-allowed' : 'pointer',
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
                                {selectedSemester === semester.id ? 'Selected' : 'Click to select'}
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
                    onClick={handleSaveDetails}
                    disabled={saving || !phone.trim() || !selectedSemester}
                    sx={{ borderRadius: 3, px: 3, py: 1.5, fontWeight: 600 }}
                  >
                    {saving ? 'Saving...' : 'Continue to Preferences'}
                  </Button>
                </Box>
              </Stack>
            )}

            {activeStep === 'preferences' && (
              <Box>
                <SchedulePreferences
                  initialPreferences={profile?.preferences}
                  onSave={handlePreferencesSave}
                  autoSave={true}
                />
                {preferencesSaved && (
                  <Alert
                    severity="success"
                    sx={{ mt: 2 }}
                    onClose={() => setPreferencesSaved(false)}
                  >
                    Preferences saved! Click "Complete & Continue" to finish setup.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </CardContent>

        {!isMobile && (
          <Box
            sx={{
              px: 3,
              pb: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              startIcon={<ChevronLeft />}
            >
              Back
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {activeStep === 'preferences' && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleCompleteOnboarding}
                  disabled={!preferencesSaved}
                  startIcon={<Check />}
                  sx={{
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    fontWeight: 600,
                  }}
                >
                  {preferencesSaved ? 'Complete & Continue' : 'Saving..'}
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Card>
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
          }}
        >
          Step {currentStepIndex + 1} of {STEPS.length}
        </Typography>
      </Box>
    </Box>
  );
}

export default function OnboardingPage() {
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
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
              }}
            >
              Welcome to AuraIsHub!
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                maxWidth: 600,
                textAlign: 'center',
              }}
            >
              Let's set up your contact details and preferences to help you optimize your semester
            </Typography>
          </Stack>

          <Box sx={{ width: '100%' }}>
            <OnboardingWizard />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
