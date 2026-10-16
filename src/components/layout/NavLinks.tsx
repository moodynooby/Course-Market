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
  const effectiveColor = to === '/' ? theme.palette.primary.main : accentColor;

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
          color: isActive ? effectiveColor : accentColor,
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
  {
    to: '/',
    label: 'Dashboard',
    icon: <CalendarMonthRounded />,
    accentColor: '#ea2b2b',
  },
  {
    to: '/trading',
    label: 'Trading',
    icon: <SwapHorizRounded />,
    accentColor: '#1cb0f6',
  },
  {
    to: '/professors',
    label: 'Rate My Prof',
    icon: <SchoolRounded />,
    accentColor: '#ff9600',
  },
  {
    to: '/courses',
    label: 'Courses',
    icon: <MenuBookRounded />,
    accentColor: '#af70ff',
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
