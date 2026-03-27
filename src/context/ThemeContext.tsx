import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useConfigContext } from './ConfigContext';
import { createAppTheme } from '../theme';

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

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { preferences, updatePreferences } = useConfigContext();
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const mode = preferences.theme || 'system';

  const setMode = (newMode: ThemeMode) => {
    updatePreferences({ theme: newMode });
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
