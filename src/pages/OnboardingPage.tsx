import { Check, ChevronLeft, School } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  MobileStepper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  stepClasses,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from '../components/ProfileCard';
import { SchedulePreferences } from '../components/SchedulePreferences';
import { useAuthContext } from '../context/AuthContext';
import type { Preferences } from '../types';

export type OnboardingStep = 'profile' | 'preferences';

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
];

function OnboardingWizard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuthContext();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getStartingStep = (): OnboardingStep => {
    if (profile?.semesterId) return 'preferences';
    return 'profile';
  };

  const [activeStep, setActiveStep] = useState<OnboardingStep>(getStartingStep());
  const [error, setError] = useState<string | null>(null);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const handleProfileSave = async (data: {
    displayName: string;
    email: string;
    phone: string;
    semesterId?: string;
  }) => {
    try {
      setError(null);
      await updateProfile(data);

      if (data.semesterId && activeStep === 'profile') {
        setError('Profile saved! You can now proceed to set your schedule preferences.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save your profile';
      setError(`${errorMessage}. Please try again or refresh the page.`);
      console.error('Error saving profile:', err);
    }
  };

  const handlePreferencesSave = async (preferences: Preferences) => {
    try {
      setError(null);
      await updateProfile({
        preferences,
        onboardingCompleted: true,
      });
      setPreferencesSaved(true);
    } catch (err) {
      setError('Failed to save preferences. Please try again.');
      console.error('Error saving preferences:', err);
      setPreferencesSaved(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      await updateProfile({ onboardingCompleted: true });
      navigate('/');
    } catch (err) {
      setError('Failed to complete onboarding. Please try again.');
      console.error('Error completing onboarding:', err);
    }
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
        sx={{
          boxShadow: theme.shadows[3],
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
                                boxShadow: theme.shadows[2],
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
            {activeStep === 'profile' && (
              <ProfileCard
                initialData={{
                  displayName: profile?.displayName || '',
                  email: profile?.email || '',
                  phone: profile?.phone || '',
                  semesterId: profile?.semesterId,
                }}
                onSave={handleProfileSave}
              />
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
              {activeStep === 'profile' && profile?.semesterId && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setActiveStep('preferences')}
                  sx={{
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    fontWeight: 600,
                  }}
                >
                  Continue to Preferences
                </Button>
              )}
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
                fontFamily: '"Zilla Slab", serif',
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
              Let's set up your profile and preferences to help you optimize your semester
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
