import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { consumeAuthReturnContext } from '../utils/authReturn';

export default function CallbackPage() {
  const { isAuthenticated, loading, profile, error: authError } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const searchParams = new URLSearchParams(location.search);
    const errorParam = searchParams.get('error_description') || searchParams.get('error');

    if (errorParam || authError) {
      handled.current = true;
      const errorMessage =
        errorParam || authError?.message || 'Sign in was cancelled or could not be completed.';
      navigate('/login', { replace: true, state: { error: errorMessage } });
      return;
    }

    if (loading) return;

    handled.current = true;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const { returnUrl } = consumeAuthReturnContext();
    const returnToParam = searchParams.get('returnTo');
    const candidate = returnUrl || returnToParam;
    const isSafeRelative = candidate?.startsWith('/') && !candidate.startsWith('//');
    const targetUrl = isSafeRelative && candidate ? candidate : '/';

    if (!profile?.semesterId) {
      navigate('/onboarding', { replace: true, state: { from: targetUrl } });
    } else {
      navigate(targetUrl, { replace: true });
    }
  }, [isAuthenticated, loading, profile, authError, navigate, location.search]);

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
