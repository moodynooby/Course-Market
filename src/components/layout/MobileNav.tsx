import {
  CalendarMonthRounded,
  MenuBookRounded,
  SchoolRounded,
  SwapHorizRounded,
} from '@mui/icons-material';
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

export function MobileNav() {
  const location = useLocation();
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
          icon={<CalendarMonthRounded />}
          component={Link}
          to="/"
          sx={{ '&.Mui-selected': { color: 'primary.main', fontWeight: 700 } }}
        />
        <BottomNavigationAction
          label="Trading"
          value="/trading"
          icon={<SwapHorizRounded />}
          component={Link}
          to="/trading"
          sx={{ '&.Mui-selected': { color: '#f59e0b', fontWeight: 700 } }}
        />
        <BottomNavigationAction
          label="Rate My Prof"
          value="/professors"
          icon={<SchoolRounded />}
          component={Link}
          to="/professors"
          sx={{ '&.Mui-selected': { color: '#10b981', fontWeight: 700 } }}
        />
        <BottomNavigationAction
          label="Courses"
          value="/courses"
          icon={<MenuBookRounded />}
          component={Link}
          to="/courses"
          sx={{ '&.Mui-selected': { color: '#0284c7', fontWeight: 700 } }}
        />
      </BottomNavigation>
    </Box>
  );
}
