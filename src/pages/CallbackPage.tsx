import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function CallbackPage() {
  const { isAuthenticated } = useAuth0();
  const { profile, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const redirectPath = profile?.onboardingCompleted ? '/' : '/onboarding';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, loading, profile, navigate]);

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
      <Typography
        variant="body1"
        sx={{
          color: 'text.secondary',
        }}
      >
        Completing sign in...
      </Typography>
    </Box>
  );
}
