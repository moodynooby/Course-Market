import { BottomNavigation, BottomNavigationAction, Box, useTheme } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './NavLinks';

export function MobileNav() {
  const location = useLocation();
  const theme = useTheme();

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
        {NAV_ITEMS.map((item) => {
          const selectedColor = item.to === '/' ? theme.palette.primary.main : item.accentColor;
          return (
            <BottomNavigationAction
              key={item.to}
              label={item.label}
              value={item.to}
              icon={item.icon}
              component={Link}
              to={item.to}
              sx={{ '&.Mui-selected': { color: selectedColor, fontWeight: 700 } }}
            />
          );
        })}
      </BottomNavigation>
    </Box>
  );
}
