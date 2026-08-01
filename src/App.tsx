import { Box } from '@mui/material';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const CallbackPage = lazy(() => import('./pages/CallbackPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const TradingPage = lazy(() => import('./pages/TradingPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ProfessorsPage = lazy(() => import('./pages/ProfessorsPage'));
const ProfessorDetailsPage = lazy(() => import('./pages/ProfessorDetailsPage'));

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <LoadingSpinner />
    </Box>
  );
}

const suspended = (El: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<LoadingFallback />}>
    <El />
  </Suspense>
);

const protectedRoute = (El: React.LazyExoticComponent<React.ComponentType>) => (
  <ProtectedRoute>{suspended(El)}</ProtectedRoute>
);

const router = createBrowserRouter([
  { path: '/login', element: suspended(LoginPage) },
  { path: '/callback', element: suspended(CallbackPage) },
  { path: '/onboarding', element: suspended(OnboardingPage) },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: protectedRoute(LandingPage) },
      { path: 'courses', element: protectedRoute(CoursesPage) },
      { path: 'trading', element: protectedRoute(TradingPage) },
      { path: 'professors', element: protectedRoute(ProfessorsPage) },
      { path: 'professors/:id', element: protectedRoute(ProfessorDetailsPage) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConfigProvider>
          <ThemeProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </ThemeProvider>
        </ConfigProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
