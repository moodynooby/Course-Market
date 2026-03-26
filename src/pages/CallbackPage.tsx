import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile } from '../services/onboardingApi';

export default function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth0();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const profile = await getUserProfile(token);

      if (profile?.onboardingCompleted) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      console.error('[CallbackPage] Error checking profile:', err);
      navigate('/onboarding', { replace: true });
    }
  }, [getToken, navigate]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        checkOnboardingStatus();
      } else if (error) {
        console.error('Auth error:', error);
        navigate('/login');
      }
    }
  }, [isAuthenticated, isLoading, error, navigate, checkOnboardingStatus]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress sx={{ mb: 2 }} />
      <Typography variant="body1" color="text.secondary">
        {error ? 'Authentication failed. Redirecting...' : 'Completing sign in...'}
      </Typography>
    </Box>
  );
}
