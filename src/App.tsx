import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ImportPage from './pages/ImportPage';
import CoursesPage from './pages/CoursesPage';
import SchedulePage from './pages/SchedulePage';
import TradingPage from './pages/TradingPage';
import SettingsPage from './pages/SettingsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AuthProvider>
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </AuthProvider>
    ),
  },
  {
    path: '/',
    element: (
      <AuthProvider>
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      </AuthProvider>
    ),
    children: [
      {
        index: true,
        element: <ImportPage />,
      },
      {
        path: 'courses',
        element: <CoursesPage />,
      },
      {
        path: 'schedule',
        element: <SchedulePage />,
      },
      {
        path: 'trading',
        element: <TradingPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
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
