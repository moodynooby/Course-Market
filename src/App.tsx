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
import { useNativeApp } from './native/useNativeApp';

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

const protectedRoute = (El: React.LazyExoticComponent<React.ComponentType>) => (
  <ProtectedRoute>{suspended(El)}</ProtectedRoute>
);

// Rendered inside the router so native hooks (deep links, etc.) that rely on
// useNavigate() have access to the router context.
function AppShell() {
  useNativeApp();
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { path: 'login', element: suspended(LoginPage) },
      { path: 'callback', element: suspended(CallbackPage) },
      { path: 'onboarding', element: suspended(OnboardingPage) },
      {
        element: <Layout />,
        children: [
          { index: true, element: protectedRoute(DashboardPage) },
          { path: 'courses', element: protectedRoute(CoursesPage) },
          { path: 'trading', element: protectedRoute(TradingPage) },
          { path: 'professors', element: protectedRoute(ProfessorsPage) },
          { path: 'professors/:id', element: protectedRoute(ProfessorDetailsPage) },
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
