import { useAuth } from '../hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { getUserProfile } from '../services/onboardingApi';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes that don't require onboarding check
const SKIP_ONBOARDING_ROUTES = ['/onboarding', '/callback', '/login'];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, getToken } = useAuth();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || loading) {
      return;
    }

    // Skip onboarding check for certain routes
    if (SKIP_ONBOARDING_ROUTES.some((route) => location.pathname.startsWith(route))) {
      setOnboardingChecked(true);
      return;
    }

    // Check onboarding status
    checkOnboardingStatus();
  }, [isAuthenticated, loading, location.pathname]);

  const checkOnboardingStatus = async () => {
    try {
      const token = await getToken();
      const profile = await getUserProfile(token);
      setOnboardingCompleted(!!profile?.onboardingCompleted);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // If check fails, allow access (don't block user)
      setOnboardingCompleted(true);
    } finally {
      setOnboardingChecked(true);
    }
  };

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
