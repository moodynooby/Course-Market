import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const testTheme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: '', 
    },
  },
});

export function renderWithTheme(ui: ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={testTheme}>{children}</ThemeProvider>,
    ...options,
  });
}

export * from '@testing-library/react';
export { renderWithTheme as render };
