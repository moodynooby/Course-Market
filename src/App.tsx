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

const LoginPage = lazy(() => import('./pages/LoginPage'));
const CallbackPage = lazy(() => import('./pages/CallbackPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const TradingPage = lazy(() => import('./pages/TradingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <LoadingSpinner />
    </Box>
  );
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/callback',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <CallbackPage />
      </Suspense>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <OnboardingPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <LandingPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'courses',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <CoursesPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'trading',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <TradingPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
