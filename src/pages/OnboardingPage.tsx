import { School } from '@mui/icons-material';
import { Avatar, Box, Container, Stack, Typography } from '@mui/material';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { useAuthContext } from '../context/AuthContext';
import type { Preferences } from '../types';

export default function OnboardingPage() {
  const { user, profile } = useAuthContext();

  const initialData = {
    displayName: profile?.displayName || user?.displayName || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    semesterId: profile?.semesterId || undefined,
    preferences: profile?.preferences as Preferences | undefined,
  };

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
