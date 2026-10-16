import { Box } from '@mui/material';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
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
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
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


const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { path: 'login', element: suspended(LoginPage) },
      { path: 'callback', element: suspended(CallbackPage) },
      { path: 'onboarding', element: suspended(OnboardingPage) },
      {
        element: (
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: suspended(DashboardPage) },
          { path: 'courses', element: suspended(CoursesPage) },
          { path: 'trading', element: suspended(TradingPage) },
          { path: 'professors', element: suspended(ProfessorsPage) },
          { path: 'professors/:id', element: suspended(ProfessorDetailsPage) },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
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
