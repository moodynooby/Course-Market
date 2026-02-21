import { vi } from 'vitest';
import type { ReactNode } from 'react';

// Mock Auth0 to avoid network calls and provider overhead
vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: ({ children }: { children: ReactNode }) => children,
  useAuth0: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: undefined,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn(),
  }),
}));

// Mock lazy-loaded pages to prevent hanging on heavy imports
vi.mock('./pages/LoginPage', () => ({
  default: () => <div data-testid="mock-login-page">Login</div>,
}));
vi.mock('./pages/CoursesPage', () => ({
  default: () => <div data-testid="mock-courses-page">Courses</div>,
}));
vi.mock('./pages/SchedulePage', () => ({
  default: () => <div data-testid="mock-schedule-page">Schedule</div>,
}));
vi.mock('./pages/TradingPage', () => ({
  default: () => <div data-testid="mock-trading-page">Trading</div>,
}));
vi.mock('./pages/SettingsPage', () => ({
  default: () => <div data-testid="mock-settings-page">Settings</div>,
}));
