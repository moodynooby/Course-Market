import {
  CalendarMonthRounded,
  MenuBookRounded,
  SchoolRounded,
  SwapHorizRounded,
} from '@mui/icons-material';
import { alpha, Box, type Theme, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';

export type NavAccent = 'primary' | 'secondary' | 'warning' | 'courses';

export function resolveNavAccent(theme: Theme, accent: NavAccent): string {
  switch (accent) {
    case 'primary':
      return theme.palette.primary.main;
    case 'secondary':
      return theme.palette.secondary.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'courses':
      return '#af70ff';
  }
}

interface NavLinkProps {
  to: string;
  label: string;
  currentPath: string;
  icon: React.ReactNode;
  accent: NavAccent;
}

function NavLink({ to, label, currentPath, icon, accent }: NavLinkProps) {
  const theme = useTheme();
  const isActive = currentPath === to || (to !== '/' && currentPath.startsWith(to));
  const effectiveColor = resolveNavAccent(theme, accent);

  return (
    <Box
      component={Link}
      to={to}
      sx={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0,
        height: 40,
        px: 1.5,
        borderRadius: '12px',
        fontWeight: 700,
        letterSpacing: '0.4px',
        fontSize: '0.875rem',
        color: isActive ? 'text.primary' : 'text.secondary',
        bgcolor: isActive ? alpha(effectiveColor, 0.12) : 'transparent',
        border: '2px solid',
        borderColor: isActive ? effectiveColor : 'transparent',
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          color: 'text.primary',
          bgcolor: alpha(effectiveColor, 0.08),
        },
        '&:active': {
          transform: 'scale(0.97)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: effectiveColor,
          '& .MuiSvgIcon-root': {
            fontSize: 18,
          },
        }}
      >
        {icon}
      </Box>
      <Box component="span">{label}</Box>
    </Box>
  );
}

interface NavLinksProps {
  currentPath: string;
}

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: <CalendarMonthRounded />, accent: 'primary' as NavAccent },
  {
    to: '/trading',
    label: 'Trading',
    icon: <SwapHorizRounded />,
    accent: 'secondary' as NavAccent,
  },
  {
    to: '/professors',
    label: 'Rate My Prof',
    icon: <SchoolRounded />,
    accent: 'warning' as NavAccent,
  },
  { to: '/courses', label: 'Courses', icon: <MenuBookRounded />, accent: 'courses' as NavAccent },
] as const;

export function NavLinks({ currentPath }: NavLinksProps) {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          label={item.label}
          currentPath={currentPath}
          icon={item.icon}
          accent={item.accent}
        />
      ))}
    </Box>
  );
}
