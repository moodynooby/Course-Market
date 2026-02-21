import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Box, CircularProgress } from '@mui/material';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CallbackPage = lazy(() => import('./pages/CallbackPage'));
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
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
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
        <RouterProvider router={router} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
