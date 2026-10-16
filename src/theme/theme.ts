import { createTheme, type ThemeOptions } from '@mui/material/styles';

const getPalette = (isDark: boolean): ThemeOptions['palette'] => {
  if (!isDark) {
    return {
      mode: 'light',
      primary: {
        main: '#ea2b2b',
        light: '#f87171',
        dark: '#b91c1c',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#1cb0f6',
        light: '#4bc2f8',
        dark: '#028ce0',
        contrastText: '#ffffff',
      },
      error: {
        main: '#ff4b4b',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#ff9600',
        contrastText: '#ffffff',
      },
      info: {
        main: '#1cb0f6',
        contrastText: '#ffffff',
      },
      success: {
        main: '#10b981',
        contrastText: '#ffffff',
      },
      background: {
        default: '#ddf4ff',
        paper: '#ffffff',
      },
      text: {
        primary: '#3c3c3c',
        secondary: '#777777',
      },
      action: {
        hover: 'rgba(28, 176, 246, 0.08)',
        selected: 'rgba(234, 43, 43, 0.14)',
      },
      divider: '#cde4f0',
    };
  }

  return {
    mode: 'dark',
    primary: {
      main: '#ff5c5c',
      light: '#ff8585',
      dark: '#c52222',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1cb0f6',
      light: '#4bc2f8',
      dark: '#028ce0',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ff6b6b',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffaa1a',
      contrastText: '#111111',
    },
    info: {
      main: '#4bc2f8',
      contrastText: '#111111',
    },
    success: {
      main: '#34d399',
      contrastText: '#111111',
    },
    background: {
      default: '#131f24',
      paper: '#1b2a32',
    },
    text: {
      primary: '#f7f7f7',
      secondary: '#9fb4c0',
    },
    action: {
      hover: 'rgba(255, 255, 255, 0.06)',
      selected: 'rgba(255, 92, 92, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.38)',
      disabledBackground: 'rgba(255, 255, 255, 0.08)',
    },
    divider: '#283b46',
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
          props: { variant: 'contained', color: 'primary' },
          style: ({ theme }) => ({
            fontWeight: 700,
            letterSpacing: '0.6px',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            boxShadow: `0 3px 0 ${theme.palette.primary.dark}`,
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#ff4b4b' : '#dc2626',
              boxShadow: `0 3px 0 ${theme.palette.mode === 'dark' ? '#b91c1c' : '#991b1b'}`,
            },
            '&:active': {
              transform: 'translateY(2px)',
              boxShadow: `0 1px 0 ${theme.palette.mode === 'dark' ? '#b91c1c' : '#991b1b'}`,
            },
          }),
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: ({ theme }) => ({
            fontWeight: 700,
            letterSpacing: '0.6px',
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
            boxShadow: `0 3px 0 ${theme.palette.secondary.dark}`,
            '&:hover': {
              backgroundColor: '#189edc',
              boxShadow: '0 3px 0 #027bc4',
            },
            '&:active': {
              transform: 'translateY(2px)',
              boxShadow: '0 1px 0 #027bc4',
            },
          }),
        },
        {
          props: { variant: 'contained', size: 'large' },
          style: {
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: '0.9375rem',
            fontWeight: 700,
          },
        },
        {
          props: { variant: 'contained', size: 'medium' },
          style: {
            borderRadius: 12,
            padding: '8px 20px',
            fontSize: '0.875rem',
            fontWeight: 700,
          },
        },
        {
          props: { variant: 'outlined' },
          style: {
            borderRadius: 12,
            borderWidth: 2,
            fontWeight: 700,
            letterSpacing: '0.5px',
            '&:hover': {
              borderWidth: 2,
            },
          },
        },
      ],
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '8px 20px',
          fontWeight: 700,
          textTransform: 'none',
          letterSpacing: '0.5px',
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
          borderRadius: 12,
          [theme.breakpoints.up('sm')]: {
            borderRadius: 14,
          },
          backgroundImage: 'none',
          border: '2px solid',
          borderColor: theme.palette.divider,
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(0,0,0,0.4)'
              : '0 2px 8px rgba(0,0,0,0.04)',
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          borderRadius: 12,
          [theme.breakpoints.up('sm')]: {
            borderRadius: 14,
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 700,
          letterSpacing: '0.4px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': {
              borderWidth: 2,
            },
            '&:hover fieldset': {
              borderWidth: 2,
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '& fieldset': {
            borderWidth: 2,
          },
          '&:hover fieldset': {
            borderWidth: 2,
          },
          '&.Mui-focused fieldset': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 16,
          border: '2px solid',
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: 24,
          paddingBottom: 16,
          fontWeight: 700,
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
          border: '2px solid',
          borderColor: theme.palette.divider,
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 6px',
          padding: '8px 14px',
          fontWeight: 600,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          height: 10,
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
          fontWeight: 600,
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
          fontWeight: 700,
          borderRadius: 10,
          minHeight: 44,
          letterSpacing: '0.5px',
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
          fontWeight: 600,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 12,
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
        fontSize: '2.5rem',
        fontWeight: 800,
        letterSpacing: '0.8px',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '0.8px',
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 700,
        letterSpacing: '0.8px',
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 700,
        letterSpacing: '0.8px',
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 700,
        letterSpacing: '0.8px',
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '0.8px',
      },
      subtitle1: { fontSize: '1rem', fontWeight: 600, letterSpacing: '0.6px' },
      subtitle2: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.6px' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.5, fontWeight: 600 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.4, fontWeight: 500 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.6px' },
      caption: { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.4px' },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
      },
    },
    shape: { borderRadius: 12 },
    components: getComponents(),
  });
};
