import {
  CalendarMonthRounded,
  MenuBookRounded,
  SchoolRounded,
  SwapHorizRounded,
} from '@mui/icons-material';
import { alpha, Box, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  label: string;
  currentPath: string;
  icon: React.ReactNode;
  accentColor: string;
}

function NavLink({ to, label, currentPath, icon, accentColor }: NavLinkProps) {
  const theme = useTheme();
  const isActive = currentPath === to || (to !== '/' && currentPath.startsWith(to));

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
        height: 38,
        px: 1.25,
        borderRadius: 2,
        fontWeight: isActive ? 700 : 600,
        fontSize: '0.875rem',
        color: isActive ? 'text.primary' : 'text.secondary',
        bgcolor: isActive
          ? alpha(accentColor, theme.palette.mode === 'dark' ? 0.18 : 0.08)
          : 'transparent',
        border: '1px solid',
        borderColor: isActive
          ? alpha(accentColor, theme.palette.mode === 'dark' ? 0.35 : 0.2)
          : 'transparent',
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          color: 'text.primary',
          bgcolor: alpha(accentColor, theme.palette.mode === 'dark' ? 0.22 : 0.12),
        },
        '&:active': {
          transform: 'scale(0.96)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          borderRadius: 1.2,
          bgcolor: alpha(accentColor, theme.palette.mode === 'dark' ? 0.3 : 0.14),
          color: accentColor,
          '& .MuiSvgIcon-root': {
            fontSize: 16,
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
  {
    to: '/',
    label: 'Dashboard',
    icon: <CalendarMonthRounded />,
    accentColor: '#4f46e5',
  },
  {
    to: '/trading',
    label: 'Trading',
    icon: <SwapHorizRounded />,
    accentColor: '#f59e0b',
  },
  {
    to: '/professors',
    label: 'Rate My Prof',
    icon: <SchoolRounded />,
    accentColor: '#10b981',
  },
  {
    to: '/courses',
    label: 'Courses',
    icon: <MenuBookRounded />,
    accentColor: '#0284c7',
  },
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
          accentColor={item.accentColor}
        />
      ))}
    </Box>
  );
}
