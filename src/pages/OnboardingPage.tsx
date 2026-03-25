import { School } from '@mui/icons-material';
import { Avatar, Box, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile } from '../services/onboardingApi';
import type { Preferences } from '../types';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<{
    displayName?: string;
    email?: string;
    phone?: string;
    semesterId?: string;
    preferences?: Preferences;
  }>({});

  const loadUserProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const profile = await getUserProfile(token);

      if (profile?.onboardingCompleted) {
        navigate('/');
        return;
      }

      if (profile) {
        setInitialData({
          displayName: profile.displayName,
          email: profile.email,
          phone: profile.phone,
          semesterId: profile.semesterId || undefined,
          preferences: profile.preferences as Preferences | undefined,
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, navigate]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAuthenticated) {
      loadUserProfile();
    }
  }, [isAuthenticated, authLoading, navigate, loadUserProfile]);

  if (authLoading || loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading your profile...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Stack alignItems="center" spacing={4}>
          <Stack alignItems="center" spacing={2}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'accent.main',
              }}
            >
              <School sx={{ fontSize: 36 }} />
            </Avatar>
            <Typography variant="h4" fontWeight={700} sx={{ fontFamily: '"Zilla Slab", serif' }}>
              Welcome to AuraIsHub!
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600, textAlign: 'center' }}
            >
              Let's set up your profile and preferences to help you optimize your semester
            </Typography>
          </Stack>

          <Box sx={{ width: '100%' }}>
            <OnboardingWizard initialData={initialData} />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
