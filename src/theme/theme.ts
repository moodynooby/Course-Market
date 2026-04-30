import { createTheme, type ThemeOptions } from '@mui/material/styles';

const getPalette = (isDark: boolean): ThemeOptions['palette'] => {
  if (!isDark) {
    return {
      mode: 'light',
      primary: {
        main: '#0061a4',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#535f70',
        contrastText: '#ffffff',
      },
      background: {
        default: '#fdfbff',
        paper: '#fdfbff',
      },
      text: {
        primary: '#1a1c1e',
        secondary: '#43474e',
      },
      action: {
        hover: 'rgba(26, 28, 30, 0.08)',
        selected: 'rgba(26, 28, 30, 0.12)',
      },
      divider: '#c4c6d0',
    };
  }

  // Dark mode
  return {
    mode: 'dark',
    primary: {
      main: '#9ecaef',
      contrastText: '#003258',
    },
    secondary: {
      main: '#bbc7db',
      contrastText: '#253140',
    },
    error: {
      main: '#ffb4ab',
      contrastText: '#690005',
    },
    background: {
      default: '#1a1c1e',
      paper: '#1a1c1e',
    },
    text: {
      primary: '#e2e2e6',
      secondary: '#c3c6cf',
    },
    action: {
      hover: 'rgba(226, 226, 230, 0.08)',
      selected: 'rgba(226, 226, 230, 0.12)',
      disabled: 'rgba(226, 226, 230, 0.38)',
      disabledBackground: 'rgba(226, 226, 230, 0.12)',
    },
    divider: '#8e9099',
  };
};

const getComponents = (_isDark: boolean): ThemeOptions['components'] => {
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
      styleOverrides: {
        root: {
          borderRadius: 9999,
          padding: '10px 24px',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 24,
          [theme.breakpoints.up('sm')]: {
            borderRadius: 32,
          },
          backgroundImage: 'none',
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
          borderRadius: 24,
          [theme.breakpoints.up('sm')]: {
            borderRadius: 32,
          },
        }),
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
            borderRadius: 24,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 24,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 24,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 24,
          [theme.breakpoints.up('sm')]: {
            borderRadius: 32,
          },
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
        paper: {
          borderRadius: 24,
          marginTop: 8,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          margin: '4px 8px',
          padding: '10px 16px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 24,
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: 24,
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
          borderRadius: 9999,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 16,
          padding: '8px 12px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          borderRadius: 9999,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 9999,
          minHeight: 48,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          borderRadius: 9999,
          height: '100%',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          margin: '4px 8px',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 24,
        },
      },
    },
  };
};

export const createAppTheme = (isDark: boolean) => {
  return createTheme({
    palette: getPalette(isDark),
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      h1: {
        fontSize: '3.5rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        fontFamily: '"Zilla Slab", serif',
      },
      h2: {
        fontSize: '1.75rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        fontFamily: '"Zilla Slab", serif',
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        fontFamily: '"Zilla Slab", serif',
      },
      h4: { fontSize: '1.25rem', fontWeight: 700, fontFamily: '"Zilla Slab", serif' },
      h5: { fontSize: '1.125rem', fontWeight: 600, fontFamily: '"Zilla Slab", serif' },
      h6: { fontSize: '1rem', fontWeight: 600, fontFamily: '"Zilla Slab", serif' },
      subtitle1: { fontSize: '1rem', fontWeight: 600 },
      subtitle2: { fontSize: '0.875rem', fontWeight: 600 },
      body1: { fontSize: '1rem', fontWeight: 400 },
      body2: { fontSize: '0.875rem', fontWeight: 400 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0' },
      caption: { fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em' },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      },
    },
    shape: { borderRadius: 16 },
    components: getComponents(isDark),
  });
};
