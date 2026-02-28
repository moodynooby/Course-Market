import { createTheme, ThemeProvider } from '@mui/material/styles';
import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement } from 'react';

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
