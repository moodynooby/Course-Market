import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Relaxed route guard for the lazy-authentication model.
 *
 * - Routes are no longer blocked for anonymous visitors (authentication is
 *   requested at action time via `useAuthGuard`, not at page load).
 * - Authenticated users without a completed profile (no `semesterId`) are
 *   redirected to onboarding so their profile data exists before actions
 *   like posting trades are allowed. Anonymous users without a profile may
 *   still browse and build schedules locally.
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, profile } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (isAuthenticated && !profile?.semesterId) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
