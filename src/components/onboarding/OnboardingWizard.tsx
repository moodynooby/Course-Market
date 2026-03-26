import { Check, ChevronLeft, ChevronRight } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MobileStepper,
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
import { savePreferences } from '../../config/userConfig';
import { useThemeMode } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { completeOnboarding, saveUserProfile } from '../../services/onboardingApi';
import type { Preferences } from '../../types';
import { StepPreferences } from './StepPreferences';
import { StepSemesterSelection } from './StepSemesterSelection';
import { StepTraderDetails } from './StepTraderDetails';

export type OnboardingStep = 'details' | 'semester' | 'preferences';

interface OnboardingWizardProps {
  initialData?: {
    displayName?: string;
    email?: string;
    phone?: string;
    semesterId?: string;
    preferences?: Preferences;
  };
}

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'details', label: 'Trader Details' },
  { id: 'semester', label: 'Semester' },
  { id: 'preferences', label: 'Preferences' },
];

export function OnboardingWizard({ initialData }: OnboardingWizardProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { setMode } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeStep, setActiveStep] = useState<OnboardingStep>(
    initialData?.semesterId ? 'preferences' : initialData?.displayName ? 'semester' : 'details',
  );

  const [userData, setUserData] = useState({
    displayName: initialData?.displayName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    semesterId: initialData?.semesterId || '',
    preferences: initialData?.preferences,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetailsComplete = async (data: {
    displayName: string;
    email: string;
    phone: string;
  }) => {
    try {
      setSaving(true);
      setError(null);

      const token = await getToken();
      await saveUserProfile(token, data);

      setUserData((prev) => ({
        ...prev,
        ...data,
      }));

      // Move to next step
      setActiveStep('semester');
    } catch (err) {
      setError('Failed to save your details. Please try again.');
      console.error('Error saving details:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSemesterComplete = async (semesterId: string) => {
    try {
      setSaving(true);
      setError(null);

      if (!semesterId || typeof semesterId !== 'string') {
        throw new Error('Invalid semester ID');
      }

      const token = await getToken();
      await saveUserProfile(token, { semesterId });

      setUserData((prev) => ({
        ...prev,
        semesterId,
      }));

      setActiveStep('preferences');
    } catch (err) {
      setError('Failed to save semester selection. Please try again.');
      console.error('[OnboardingWizard] Error saving semester:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesComplete = async (preferences: Preferences) => {
    try {
      setSaving(true);
      setError(null);

      const token = await getToken();
      await completeOnboarding(token, preferences);

      setUserData((prev) => ({
        ...prev,
        preferences,
      }));

      // Save preferences to localStorage for immediate use
      savePreferences(preferences);

      // Apply theme preference after onboarding completes
      if (preferences.theme) {
        setMode(preferences.theme);
      }

      // Onboarding complete - redirect to dashboard
      navigate('/');
    } catch (err) {
      setError('Failed to complete onboarding. Please try again.');
      console.error('Error completing onboarding:', err);
    } finally {
      setSaving(false);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', width: '100%' }}>
      <Card
        sx={{
          boxShadow: theme.shadows[3],
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Progress Indicator */}
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
                  bgcolor: 'accent.main',
                  borderRadius: 3,
                },
              }}
            />
          ) : (
            <Stepper
              activeStep={currentStepIndex}
              sx={{
                [`& .${stepClasses.completed}`]: {
                  color: 'accent.main',
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
                      StepIconComponent={({ completed }) =>
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
                              bgcolor: 'accent.main',
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
                        )
                      }
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={isActive ? 700 : 600}
                        color={isActive ? 'text.primary' : 'text.secondary'}
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

          {/* Step Content */}
          <Box sx={{ minHeight: 400 }}>
            {activeStep === 'details' && (
              <StepTraderDetails
                onComplete={handleDetailsComplete}
                initialData={{
                  displayName: userData.displayName,
                  email: userData.email,
                  phone: userData.phone,
                }}
              />
            )}

            {activeStep === 'semester' && (
              <StepSemesterSelection
                onComplete={handleSemesterComplete}
                selectedSemesterId={userData.semesterId}
              />
            )}

            {activeStep === 'preferences' && (
              <StepPreferences
                onComplete={handlePreferencesComplete}
                initialPreferences={userData.preferences}
              />
            )}
          </Box>
        </CardContent>

        {/* Navigation Buttons */}
        {!isMobile && (
          <Box
            sx={{
              px: 3,
              pb: 3,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Button
              onClick={() => {
                const prevIndex = currentStepIndex - 1;
                if (prevIndex >= 0) {
                  setActiveStep(STEPS[prevIndex].id);
                }
              }}
              disabled={currentStepIndex === 0 || saving}
              startIcon={<ChevronLeft />}
            >
              Back
            </Button>

            {isLastStep ? null : (
              <Button
                onClick={() => {
                  const nextIndex = currentStepIndex + 1;
                  if (nextIndex < STEPS.length) {
                    setActiveStep(STEPS[nextIndex].id);
                  }
                }}
                disabled={saving}
                endIcon={<ChevronRight />}
              >
                Next
              </Button>
            )}
          </Box>
        )}
      </Card>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Step {currentStepIndex + 1} of {STEPS.length}
        </Typography>
      </Box>
    </Box>
  );
}
