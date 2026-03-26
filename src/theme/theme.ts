import { createTheme, type ThemeOptions } from '@mui/material/styles';

// DESIGN.md Color Palette - "The Ethereal Tactile"
const COLORS = {
  // Core Palette
  VOID: '#0e0e0e', // Surface/Background
  PRIMARY: '#c6c6c6', // Primary (Neutral Soft)
  PRIMARY_DIM: '#b8b9b9', // For gradients
  PRIMARY_FIXED: '#e2e2e2', // Never use pure white
  TERTIARY: '#ffb148', // The Accent (Orange)
  TERTIARY_CONTRAST: '#573500',
  ERROR: '#fa746f', // Softened coral
  ON_SURFACE_VARIANT: '#acabaa', // Secondary text

  // Surface Hierarchy (Nested trays)
  SURFACE_CONTAINER_LOW: '#131313', // Level 1 (Sections)
  SURFACE_CONTAINER_LOWEST: '#1a1a1a', // Alternate Level 1
  SURFACE_CONTAINER_HIGH: '#1f2020', // Level 2 (Cards/Modules)
  SURFACE_CONTAINER_HIGHEST: '#252626', // Level 2.5 (Inputs)
  SURFACE_BRIGHT: '#2c2c2c', // Level 3 (Interactive/Floating)

  // Ghost Border
  OUTLINE_VARIANT: 'rgba(72, 72, 72, 0.15)', // 15% opacity
};

const getPalette = (isDark: boolean): ThemeOptions['palette'] => {
  // For now, we focus on dark mode as primary per DESIGN.md
  if (!isDark) {
    // Light mode fallback (not the primary design target)
    return {
      mode: 'light',
      primary: {
        main: '#3f4041',
        contrastText: '#fcf9f8',
      },
      secondary: {
        main: '#dcdbd9',
        contrastText: '#191a1a',
      },
      accent: {
        main: COLORS.TERTIARY,
        contrastText: COLORS.TERTIARY_CONTRAST,
      },
      background: {
        default: '#fcf9f8',
        paper: '#f4f3f2',
      },
      text: {
        primary: '#191a1a',
        secondary: '#565555',
      },
      action: {
        hover: '#e8e7e6',
        selected: '#dcdbd9',
      },
      divider: 'rgba(0, 0, 0, 0.08)',
    };
  }

  // Dark mode - "The Ethereal Tactile"
  return {
    mode: 'dark',
    primary: {
      main: COLORS.PRIMARY,
      contrastText: '#3f4041',
    },
    secondary: {
      main: COLORS.SURFACE_BRIGHT,
      contrastText: COLORS.PRIMARY_FIXED,
    },
    accent: {
      main: COLORS.TERTIARY,
      light: '#ffc06e',
      dark: '#f8a010',
      contrastText: COLORS.TERTIARY_CONTRAST,
    },
    error: {
      main: COLORS.ERROR,
      light: '#ff9a96',
      dark: '#c94f4a',
      contrastText: '#571a1a',
    },
    background: {
      default: COLORS.VOID,
      paper: COLORS.SURFACE_CONTAINER_LOW,
    },
    text: {
      primary: COLORS.PRIMARY_FIXED,
      secondary: COLORS.ON_SURFACE_VARIANT,
    },
    action: {
      hover: COLORS.SURFACE_CONTAINER_HIGH,
      selected: COLORS.SURFACE_BRIGHT,
      disabled: COLORS.ON_SURFACE_VARIANT,
      disabledBackground: 'rgba(255, 255, 255, 0.05)',
    },
    divider: COLORS.OUTLINE_VARIANT,
    // Custom surface tokens
    surface: {
      default: COLORS.VOID,
      containerLow: COLORS.SURFACE_CONTAINER_LOW,
      containerLowest: COLORS.SURFACE_CONTAINER_LOWEST,
      containerHigh: COLORS.SURFACE_CONTAINER_HIGH,
      containerHighest: COLORS.SURFACE_CONTAINER_HIGHEST,
      bright: COLORS.SURFACE_BRIGHT,
    },
  };
};

const getComponents = (isDark: boolean): ThemeOptions['components'] => {
  const isDarkMode = isDark;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'none',
          backgroundColor: COLORS.VOID,
        },
      },
    },

    // Buttons - rounded-full (9999px)
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
          letterSpacing: '0',
          transition: 'all 0.2s ease',
        },
        contained: {
          background: isDarkMode
            ? `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.PRIMARY_DIM})`
            : undefined,
          color: '#3f4041',
          '&:hover': {
            background: isDarkMode
              ? `linear-gradient(135deg, ${COLORS.PRIMARY_FIXED}, ${COLORS.PRIMARY})`
              : undefined,
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
          },
        },
        containedSecondary: {
          background: COLORS.SURFACE_BRIGHT,
          color: COLORS.PRIMARY_FIXED,
          '&:hover': {
            background: '#3c3c3c',
          },
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'accent' },
          style: {
            background: COLORS.TERTIARY,
            color: COLORS.TERTIARY_CONTRAST,
            '&:hover': {
              background: '#ffc06e',
              boxShadow: '0px 4px 12px rgba(255, 177, 72, 0.3)',
            },
          },
        },
        {
          props: { variant: 'outlined', color: 'accent' },
          style: {
            borderColor: COLORS.TERTIARY,
            color: COLORS.TERTIARY,
            '&:hover': {
              backgroundColor: 'rgba(255, 177, 72, 0.08)',
              borderColor: '#ffc06e',
            },
          },
        },
        {
          props: { variant: 'text', color: 'accent' },
          style: {
            color: COLORS.TERTIARY,
            '&:hover': {
              backgroundColor: 'rgba(255, 177, 72, 0.08)',
            },
          },
        },
      ],
    },

    // Cards - rounded-lg (32px), no borders
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 32,
          backgroundColor: COLORS.SURFACE_CONTAINER_HIGH,
          backgroundImage: 'none',
          border: 'none',
          boxShadow: 'none',
          overflow: 'hidden',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },

    // Paper - for dialogs, menus
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: COLORS.SURFACE_CONTAINER_HIGH,
          borderRadius: 32,
          border: 'none',
        },
        elevation: {
          boxShadow: '0px 24px 48px rgba(0, 0, 0, 0.4)',
        },
      },
    },

    // Chips - rounded-full
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          fontWeight: 600,
          border: 'none',
        },
      },
    },

    // Text Fields - rounded-md (24px for inner), surfaceContainerHighest
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 24,
            backgroundColor: COLORS.SURFACE_CONTAINER_HIGHEST,
            '& fieldset': {
              borderColor: 'rgba(72, 72, 72, 0.3)',
              borderWidth: 1,
            },
            '&:hover fieldset': {
              borderColor: 'rgba(72, 72, 72, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: COLORS.TERTIARY,
              borderWidth: 1,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 2px rgba(255, 177, 72, 0.1)`,
            },
          },
          '& .MuiInputBase-input': {
            color: COLORS.PRIMARY_FIXED,
            '&::placeholder': {
              color: COLORS.ON_SURFACE_VARIANT,
            },
          },
          '& .MuiFormLabel-root': {
            color: COLORS.ON_SURFACE_VARIANT,
            '&.Mui-focused': {
              color: COLORS.TERTIARY,
            },
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

    // Dialogs
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 32,
          backgroundColor: COLORS.SURFACE_CONTAINER_HIGH,
          border: 'none',
        },
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
          padding: '0 24px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          borderTop: `1px solid ${COLORS.OUTLINE_VARIANT}`,
        },
      },
    },

    // Menu
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundColor: COLORS.SURFACE_CONTAINER_HIGH,
          border: `1px solid ${COLORS.OUTLINE_VARIANT}`,
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
          '&:hover': {
            backgroundColor: COLORS.SURFACE_BRIGHT,
          },
        },
      },
    },

    // Avatar
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.PRIMARY,
          color: '#3f4041',
          fontWeight: 600,
        },
      },
    },

    // Typography
    MuiTypography: {
      styleOverrides: {
        root: {
          '& a': {
            color: COLORS.TERTIARY,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          },
        },
      },
    },

    // Divider - use sparingly, 15% opacity
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: COLORS.OUTLINE_VARIANT,
        },
      },
    },

    // Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: 'none',
        },
      },
    },

    // Snackbar
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backgroundColor: COLORS.SURFACE_BRIGHT,
          border: `1px solid ${COLORS.OUTLINE_VARIANT}`,
        },
      },
    },

    // LinearProgress
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          height: 8,
          backgroundColor: COLORS.SURFACE_CONTAINER_HIGHEST,
        },
      },
    },

    // IconButton
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          '&:hover': {
            backgroundColor: COLORS.SURFACE_BRIGHT,
          },
        },
      },
    },

    // FormControlLabel
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginLeft: 0,
        },
      },
    },

    // Radio
    MuiRadio: {
      styleOverrides: {
        root: {
          color: COLORS.ON_SURFACE_VARIANT,
          '&.Mui-checked': {
            color: COLORS.TERTIARY,
          },
        },
      },
    },

    // Checkbox
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: COLORS.ON_SURFACE_VARIANT,
          '&.Mui-checked': {
            color: COLORS.TERTIARY,
          },
        },
      },
    },

    // Switch
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: COLORS.TERTIARY,
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: COLORS.TERTIARY,
          },
        },
      },
    },

    // Tooltip
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.SURFACE_BRIGHT,
          borderRadius: 16,
          padding: '8px 12px',
          fontSize: '0.875rem',
          border: `1px solid ${COLORS.OUTLINE_VARIANT}`,
        },
      },
    },

    // Badge
    MuiBadge: {
      styleOverrides: {
        badge: {
          borderRadius: 9999,
        },
      },
    },

    // Tabs
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 9999,
          minHeight: 48,
          '&.Mui-selected': {
            color: COLORS.TERTIARY,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          borderRadius: 9999,
          height: '100%',
          backgroundColor: 'rgba(255, 177, 72, 0.1)',
        },
      },
    },

    // List
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: COLORS.SURFACE_BRIGHT,
          },
        },
      },
    },

    // Select
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backgroundColor: COLORS.SURFACE_CONTAINER_HIGHEST,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(72, 72, 72, 0.3)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(72, 72, 72, 0.5)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: COLORS.TERTIARY,
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiFormHelperText-root': {
            color: COLORS.ON_SURFACE_VARIANT,
          },
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
      // DESIGN.md Typography Scale
      h1: {
        fontSize: '3.5rem', // Display-LG
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: isDark ? COLORS.PRIMARY_FIXED : undefined,
      },
      h2: {
        fontSize: '1.75rem', // Headline-MD
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: isDark ? COLORS.PRIMARY_FIXED : undefined,
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 700,
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 600,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 600,
      },
      body1: {
        fontSize: '1rem', // Body-LG
        fontWeight: 400,
        color: isDark ? COLORS.PRIMARY_FIXED : undefined,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
        color: isDark ? COLORS.ON_SURFACE_VARIANT : undefined,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0',
      },
      caption: {
        fontSize: '0.75rem', // Label-MD
        fontWeight: 500,
        letterSpacing: '0.05em',
      },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      },
    },
    shape: {
      borderRadius: 16,
    },
    components: getComponents(isDark),
  });
};
