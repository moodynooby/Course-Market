import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { LoadingState } from '../components/EmptyState';

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

  return <LoadingState message="Completing sign in..." variant="fullscreen" />;
}
