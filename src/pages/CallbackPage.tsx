import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function CallbackPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { profile, isProfileLoading, loading: contextLoading } = useAuthContext();
  const navigate = useNavigate();

  const isLoading = authLoading || contextLoading || isProfileLoading;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirectPath = profile?.onboardingCompleted ? '/' : '/onboarding';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, isLoading, profile, navigate]);

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
        Completing sign in...
      </Typography>
    </Box>
  );
}
