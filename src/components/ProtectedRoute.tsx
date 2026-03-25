import { Box, CircularProgress } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile } from '../services/onboardingApi';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const SKIP_ONBOARDING_ROUTES = ['/onboarding', '/callback', '/login'];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, getToken } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const profile = await getUserProfile(token);
      setOnboardingCompleted(!!profile?.onboardingCompleted);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setOnboardingCompleted(true);
    } finally {
      setOnboardingChecked(true);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isAuthenticated || loading) {
      return;
    }

    if (SKIP_ONBOARDING_ROUTES.some((route) => location.pathname.startsWith(route))) {
      setOnboardingChecked(true);
      return;
    }

    checkOnboardingStatus();
  }, [isAuthenticated, loading, location.pathname, checkOnboardingStatus]);

  if (loading || !onboardingChecked) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
