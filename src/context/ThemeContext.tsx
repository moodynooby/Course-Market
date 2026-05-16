import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { createAppTheme } from '../theme';
import { STORAGE_KEYS } from '../utils/constants';

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

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    if (stored) return JSON.parse(stored) as ThemeMode;
  } catch {
    /* ignore */
  }
  try {
    const prefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (parsed.theme) return parsed.theme as ThemeMode;
    }
  } catch {
    /* ignore */
  }
  return 'system';
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
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, JSON.stringify(newMode));
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
