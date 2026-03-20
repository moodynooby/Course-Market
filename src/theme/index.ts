import { createTheme } from '@mui/material/styles';
import { getPalette } from './palette';
import { getComponents } from './components';
import './types'; // Import augmentations

export const createAppTheme = (isDark: boolean) => {
  return createTheme({
    palette: getPalette(isDark),
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 600, letterSpacing: '-0.01em' },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 16,
    },
    components: getComponents(isDark),
  });
};
