import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const SKIP_ONBOARDING_ROUTES = ['/onboarding', '/callback', '/login'];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, profile } = useAuthContext();
  const location = useLocation();

  const onboardingCompleted = profile?.onboardingCompleted ?? false;

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const shouldSkipCheck = SKIP_ONBOARDING_ROUTES.some((route) =>
    location.pathname.startsWith(route),
  );

  if (!shouldSkipCheck && !onboardingCompleted) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
