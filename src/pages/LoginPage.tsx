import { Google, School } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuthContext } from '../context/AuthContext';
import { getAuthReturnContext } from '../utils/authReturn';

export default function LoginPage() {
  const { signIn, isAuthenticated, loading } = useAuthContext();
  const location = useLocation();
  const [signingIn, setSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { returnUrl, errorMsg } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const stored = getAuthReturnContext();
    const state = location.state as
      | {
          from?: string | { pathname: string; search?: string };
          error?: string;
        }
      | undefined;

    const fromState =
      typeof state?.from === 'string'
        ? state.from
        : state?.from?.pathname
          ? `${state.from.pathname}${state.from.search || ''}`
          : null;

    const targetUrl = searchParams.get('returnTo') || fromState || stored.returnUrl || '/';
    const safeTargetUrl =
      targetUrl.startsWith('/') && !targetUrl.startsWith('//') ? targetUrl : '/';

    const err =
      searchParams.get('error_description') || searchParams.get('error') || state?.error || null;

    return { returnUrl: safeTargetUrl, errorMsg: err };
  }, [location]);

  const activeError = localError || errorMsg;

  const handleSignIn = useCallback(async () => {
    setSigningIn(true);
    setLocalError(null);
    try {
      await signIn(returnUrl);
    } catch (err) {
      setSigningIn(false);
      const msg =
        err instanceof Error ? err.message : 'Sign-in could not be started. Please try again.';
      setLocalError(msg);
    }
  }, [returnUrl, signIn]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={returnUrl} replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          maxWidth: 450,
          width: '100%',
          borderRadius: '16px',
          border: '2px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mx: 'auto',
                mb: 2,
                boxShadow: (theme) => `0 4px 0 ${theme.palette.primary.dark}`,
              }}
            >
              <School sx={{ fontSize: 38 }} />
            </Avatar>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              AuraIs
              <Box
                component="span"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  px: 1,
                  py: 0.2,
                  borderRadius: '8px',
                  ml: 0.75,
                  fontSize: '0.85em',
                  fontWeight: 800,
                }}
              >
                HUB
              </Box>
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 1,
                fontWeight: 600,
              }}
            >
              Course scheduling and section trading made simple and fun.
            </Typography>
          </Box>

          {activeError && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setLocalError(null)}
            >
              {activeError}
            </Alert>
          )}

          <Stack spacing={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={signingIn}
              onClick={handleSignIn}
              startIcon={!signingIn ? <Google /> : undefined}
              sx={{
                py: 1.5,
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
              }}
            >
              {signingIn ? (
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'center' }}
                >
                  <CircularProgress size={20} color="inherit" />
                  <span>Connecting to Google...</span>
                </Stack>
              ) : (
                'Continue with Google'
              )}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
