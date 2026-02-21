import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Minimal theme for faster test rendering
const testTheme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: '', // Skip baseline styles in tests
    },
  },
});

// Custom render that includes MUI theme provider
export function renderWithTheme(ui: ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={testTheme}>{children}</ThemeProvider>,
    ...options,
  });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithTheme as render };
