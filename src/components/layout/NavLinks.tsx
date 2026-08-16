import { Box } from '@mui/material';
import { Link } from 'react-router-dom';
import callMissedIcon from '../../assets/3dicons-call-missed-dynamic-color.png';
import folderIcon from '../../assets/3dicons-folder-dynamic-color.png';
import lockIcon from '../../assets/3dicons-locker-dynamic-premium.png';
import ProfIcon from '../../assets/3dicons-skull-dynamic-color.png';
import { isNativePlatform } from '../../native/capacitor';

interface NavLinkProps {
  to: string;
  label: string;
  currentPath: string;
  icon?: React.ReactNode;
}

function NavLink({ to, label, currentPath, icon }: NavLinkProps) {
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
        minHeight: 48,
        height: 64,
        px: 1,
        fontWeight: 700,
        color: isActive ? 'secondary.main' : 'text.secondary',
        borderBottom: isActive ? '2px solid' : '2px solid transparent',
        borderColor: isActive ? 'secondary.main' : 'transparent',
        transition: 'all 0.2s',
        '&:hover': {
          color: isActive ? 'secondary.main' : 'text.primary',
        },
        '&:active': {
          transform: 'scale(0.95)',
        },
      }}
    >
      {icon}
      {label}
    </Box>
  );
}

interface NavLinksProps {
  currentPath: string;
}

export function NavLinks({ currentPath }: NavLinksProps) {
  // Native apps are always sized like a phone, so the desktop-only header tabs
  // would never appear. Show them in the header regardless of breakpoint there.
  const showTabs = isNativePlatform();
  return (
    <Box
      sx={{
        display: showTabs ? 'flex' : { xs: 'none', md: 'flex' },
        alignItems: 'center',
        gap: { xs: 1, sm: 2 },
        minWidth: 0,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <NavLink
        to="/"
        label="Dashboard"
        currentPath={currentPath}
        icon={<Box component="img" src={callMissedIcon} alt="" sx={{ width: 24, height: 24 }} />}
      />
      <NavLink
        to="/trading"
        label="Trading"
        currentPath={currentPath}
        icon={<Box component="img" src={lockIcon} alt="" sx={{ width: 24, height: 24 }} />}
      />
      <NavLink
        to="/professors"
        label="Rate My Prof"
        currentPath={currentPath}
        icon={<Box component="img" src={ProfIcon} alt="" sx={{ width: 24, height: 24 }} />}
      />
      <NavLink
        to="/courses"
        label="Courses"
        currentPath={currentPath}
        icon={<Box component="img" src={folderIcon} alt="" sx={{ width: 24, height: 24 }} />}
      />
    </Box>
  );
}
