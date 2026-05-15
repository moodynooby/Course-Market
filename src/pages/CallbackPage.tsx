import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function CallbackPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { profile, loading } = useAuthContext();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (authLoading || loading) return;

    if (!isAuthenticated) {
      handled.current = true;
      navigate('/login', { replace: true });
      return;
    }

    const redirectPath = profile?.semesterId ? '/' : '/onboarding';
    handled.current = true;
    navigate(redirectPath, { replace: true });
  }, [isAuthenticated, authLoading, loading, profile, navigate]);

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
        Signing you in...
      </Typography>
    </Box>
  );
}
