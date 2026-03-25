import { createTheme, type ThemeOptions } from '@mui/material/styles';

const getPalette = (isDark: boolean): ThemeOptions['palette'] => ({
  mode: isDark ? 'dark' : 'light',
  primary: {
    main: isDark ? '#c6c6c6' : '#3f4041',
    contrastText: isDark ? '#3f4041' : '#fcf9f8',
  },
  secondary: {
    main: isDark ? '#2c2c2c' : '#dcdbd9',
    contrastText: isDark ? '#e7e5e4' : '#191a1a',
  },
  accent: {
    main: '#ffb148',
    contrastText: '#573500',
  },
  background: {
    default: isDark ? '#0e0e0e' : '#fcf9f8',
    paper: isDark ? '#131313' : '#f4f3f2',
  },
  text: {
    primary: isDark ? '#e7e5e4' : '#191a1a',
    secondary: isDark ? '#acabaa' : '#565555',
  },
  action: {
    hover: isDark ? '#1f2020' : '#e8e7e6',
    selected: isDark ? '#2c2c2c' : '#dcdbd9',
  },
  divider: isDark ? 'rgba(72, 72, 72, 0.15)' : 'rgba(0, 0, 0, 0.08)',
});

const getComponents = (isDark: boolean): ThemeOptions['components'] => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        transition: 'none',
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: false,
    },
    styleOverrides: {
      root: {
        borderRadius: 9999,
        padding: '10px 24px',
      },
      containedSecondary: {
        background: isDark ? '#2c2c2c' : '#dcdbd9',
        color: isDark ? '#e7e5e4' : '#191a1a',
        '&:hover': {
          background: isDark ? '#3c3c3c' : '#c8c7c5',
        },
      },
    },
    variants: [
      {
        props: { variant: 'contained', color: 'accent' },
        style: {
          background: '#ffb148',
          color: '#573500',
          '&:hover': {
            background: '#f8a010',
          },
        },
      },
      {
        props: { variant: 'outlined', color: 'accent' },
        style: {
          borderColor: '#ffb148',
          color: '#ffb148',
          '&:hover': {
            backgroundColor: 'rgba(255, 177, 72, 0.08)',
            borderColor: '#f8a010',
          },
        },
      },
    ],
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 24,
        backgroundColor: isDark ? '#191a1a' : '#ffffff',
        backgroundImage: 'none',
        border: '1px solid',
        borderColor: isDark ? 'rgba(72, 72, 72, 0.15)' : 'rgba(0, 0, 0, 0.05)',
        boxShadow: isDark ? 'none' : '0px 4px 20px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: isDark ? '#131313' : '#f4f3f2',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 9999,
        fontWeight: 600,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 16,
          backgroundColor: isDark ? '#1f2020' : '#ffffff',
          '& fieldset': {
            borderColor: isDark ? 'rgba(72, 72, 72, 0.15)' : 'rgba(0, 0, 0, 0.08)',
          },
          '&:hover fieldset': {
            borderColor: isDark ? 'rgba(72, 72, 72, 0.3)' : 'rgba(0, 0, 0, 0.15)',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#ffb148',
          },
        },
      },
    },
  },
});

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
