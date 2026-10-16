import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Route guard requiring authentication and complete onboarding.
 *
 * - Unauthenticated visitors are redirected to /login with return state.
 * - Authenticated users without a completed profile (no `semesterId`)
 *   are redirected to /onboarding.
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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile?.semesterId) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
