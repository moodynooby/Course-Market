import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function CallbackPage() {
  const { isAuthenticated, loading, profile } = useAuthContext();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (loading) return;

    handled.current = true;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    navigate(profile?.semesterId ? '/' : '/onboarding', { replace: true });
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
        Signing you in...
      </Typography>
    </Box>
  );
}
