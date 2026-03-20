import type { PaletteOptions } from '@mui/material/styles';

export const getPalette = (isDark: boolean): PaletteOptions => ({
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
