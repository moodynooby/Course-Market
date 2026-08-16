import { Dashboard, MenuBook, Person, SwapHoriz } from '@mui/icons-material';
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { isNativePlatform } from '../../native/capacitor';

export function MobileNav() {
  const location = useLocation();

  // Native apps show the header tabs instead, so the bottom nav is redundant there.
  if (isNativePlatform()) return null;

  return (
    <Box
      component="nav"
      aria-label="Mobile navigation"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: { xs: 'block', md: 'none' },
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation value={location.pathname} showLabels sx={{ bgcolor: 'background.paper' }}>
        <BottomNavigationAction
          label="Dashboard"
          value="/"
          icon={<Dashboard />}
          component={Link}
          to="/"
          sx={{ '&.Mui-selected': { color: 'secondary.main' } }}
        />
        <BottomNavigationAction
          label="Trading"
          value="/trading"
          icon={<SwapHoriz />}
          component={Link}
          to="/trading"
          sx={{ '&.Mui-selected': { color: 'secondary.main' } }}
        />
        <BottomNavigationAction
          label="Rate My Prof"
          value="/professors"
          icon={<Person />}
          component={Link}
          to="/professors"
          sx={{ '&.Mui-selected': { color: 'secondary.main' } }}
        />
        <BottomNavigationAction
          label="Courses"
          value="/courses"
          icon={<MenuBook />}
          component={Link}
          to="/courses"
          sx={{ '&.Mui-selected': { color: 'secondary.main' } }}
        />
      </BottomNavigation>
    </Box>
  );
}
