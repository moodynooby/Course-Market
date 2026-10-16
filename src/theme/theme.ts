import { createTheme, type ThemeOptions } from '@mui/material/styles';

const getPalette = (isDark: boolean): ThemeOptions['palette'] => {
  if (!isDark) {
    return {
      mode: 'light',
      primary: {
        main: '#4f46e5',
        light: '#6366f1',
        dark: '#4338ca',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#0f172a',
        light: '#334155',
        dark: '#020617',
        contrastText: '#ffffff',
      },
      error: {
        main: '#ef4444',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#f59e0b',
        contrastText: '#ffffff',
      },
      info: {
        main: '#06b6d4',
        contrastText: '#ffffff',
      },
      success: {
        main: '#10b981',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f8fafc',
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a',
        secondary: '#64748b',
      },
      action: {
        hover: 'rgba(15, 23, 42, 0.04)',
        selected: 'rgba(79, 70, 229, 0.08)',
      },
      divider: '#e2e8f0',
    };
  }

  return {
    mode: 'dark',
    primary: {
      main: '#818cf8',
      light: '#a5b4fc',
      dark: '#6366f1',
      contrastText: '#0f172a',
    },
    secondary: {
      main: '#e2e8f0',
      light: '#f8fafc',
      dark: '#94a3b8',
      contrastText: '#0f172a',
    },
    error: {
      main: '#f87171',
      contrastText: '#450a0a',
    },
    warning: {
      main: '#fbbf24',
      contrastText: '#451a03',
    },
    info: {
      main: '#22d3ee',
      contrastText: '#083344',
    },
    success: {
      main: '#34d399',
      contrastText: '#022c22',
    },
    background: {
      default: '#0b0f19',
      paper: '#111827',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    action: {
      hover: 'rgba(255, 255, 255, 0.05)',
      selected: 'rgba(129, 140, 248, 0.12)',
      disabled: 'rgba(255, 255, 255, 0.38)',
      disabledBackground: 'rgba(255, 255, 255, 0.08)',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  };
};

const getComponents = (): ThemeOptions['components'] => {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      variants: [
        {
          props: { variant: 'contained', color: 'secondary', size: 'large' },
          style: {
            borderRadius: 10,
            padding: '12px 28px',
            fontWeight: 700,
          },
        },
        {
          props: { variant: 'contained', size: 'medium' },
          style: {
            borderRadius: 10,
            padding: '8px 20px',
            fontWeight: 600,
          },
        },
        {
          props: { variant: 'outlined', size: 'small' },
          style: {
            borderRadius: 8,
          },
        },
      ],
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.15s ease-in-out',
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 14,
          [theme.breakpoints.up('sm')]: {
            borderRadius: 16,
          },
          backgroundImage: 'none',
          border: '1px solid',
          borderColor: theme.palette.divider,
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 4px 20px -2px rgba(0,0,0,0.45)'
              : '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.02)',
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': {
            paddingBottom: '24px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          borderRadius: 14,
          [theme.breakpoints.up('sm')]: {
            borderRadius: 16,
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 16,
          [theme.breakpoints.up('sm')]: {
            borderRadius: 20,
          },
          border: '1px solid',
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: 24,
          paddingBottom: 16,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 12,
          marginTop: 8,
          border: '1px solid',
          borderColor: theme.palette.divider,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 6px',
          padding: '8px 14px',
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          height: 8,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 0.15s ease-in-out',
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: '0.8125rem',
          fontWeight: 500,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          borderRadius: 9999,
          fontWeight: 700,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          minHeight: 44,
          zIndex: 1,
          color: theme.palette.text.secondary,
          '&.Mui-selected': {
            color: theme.palette.primary.contrastText,
          },
        }),
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          borderRadius: 10,
          height: '100%',
          zIndex: 0,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 6px',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  };
};

export const createAppTheme = (isDark: boolean) => {
  return createTheme({
    palette: getPalette(isDark),
    typography: {
      fontFamily:
        '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontSize: '2.75rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 700,
        letterSpacing: '-0.015em',
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      subtitle1: { fontSize: '1rem', fontWeight: 600 },
      subtitle2: { fontSize: '0.875rem', fontWeight: 600 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6, fontWeight: 400 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 400 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0' },
      caption: { fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.02em' },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      },
    },
    shape: { borderRadius: 10 },
    components: getComponents(),
  });
};
