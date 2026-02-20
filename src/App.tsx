import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const TradingPage = lazy(() => import('./pages/TradingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  return user ? (
    <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
  ) : (
    <Navigate to="/login" replace />
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  return user ? (
    <Navigate to="/" replace />
  ) : (
    <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <Layout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/courses" replace />,
      },
      {
        path: 'courses',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <CoursesPage />
          </Suspense>
        ),
      },
      {
        path: 'schedule',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SchedulePage />
          </Suspense>
        ),
      },
      {
        path: 'trading',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TradingPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SettingsPage />
          </Suspense>
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
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
