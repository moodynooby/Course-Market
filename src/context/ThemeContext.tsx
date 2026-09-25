import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { createAppTheme } from '../theme';
import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  setMode: () => {},
  isDark: false,
});

export const useThemeMode = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getInitialMode(): ThemeMode {
  const storedMode = storage.get<unknown>(STORAGE_KEYS.THEME_MODE, 'system');
  if (isThemeMode(storedMode)) return storedMode;

  const preferences = storage.get<{ theme?: unknown }>(STORAGE_KEYS.PREFERENCES, {});
  return isThemeMode(preferences.theme) ? preferences.theme : 'system';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    storage.set(STORAGE_KEYS.THEME_MODE, newMode);
  };

  const isDark = mode === 'system' ? systemDark : mode === 'dark';

  const theme = useMemo(() => createAppTheme(isDark), [isDark]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
