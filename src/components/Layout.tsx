import { DarkMode, LightMode, Settings, SettingsBrightness, Logout } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  useTheme,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useState, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';

interface NavLinkProps {
  to: string;
  label: string;
  primary?: boolean;
  currentPath: string;
}

function NavLink({ to, label, primary = false, currentPath }: NavLinkProps) {
  const isActive = currentPath === to || (to !== '/' && currentPath.startsWith(to));

  if (primary) {
    return (
      <Box
        component={Link}
        to={to}
        sx={{
          textDecoration: 'none',
          fontWeight: 700,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: 1,
          color: isActive ? 'accent.main' : 'text.secondary',
          borderBottom: isActive ? '2px solid' : '2px solid transparent',
          borderColor: isActive ? 'accent.main' : 'transparent',
          transition: 'all 0.2s',
          '&:hover': {
            color: isActive ? 'accent.main' : 'text.primary',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        {label}
      </Box>
    );
  }

  return (
    <Box
      component={Link}
      to={to}
      sx={{
        textDecoration: 'none',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: isActive ? 'text.primary' : 'text.secondary',
        transition: 'color 0.2s',
        '&:hover': {
          color: 'text.primary',
        },
      }}
    >
      {label}
    </Box>
  );
}
import HelpDialog from './HelpDialog';
import callMissedIcon from '../assets/3dicons-call-missed-dynamic-color.png';
import lockIcon from '../assets/3dicons-locker-dynamic-premium.png';
import logoIcon from '../assets/logo.png';
export default function Layout() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useThemeMode();
  const { user, signOut, signIn } = useAuth();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const toggleMode = useCallback(() => {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  }, [mode, setMode]);

  const ModeIcon =
    mode === 'light' ? (
      <LightMode fontSize="small" />
    ) : mode === 'dark' ? (
      <DarkMode fontSize="small" />
    ) : (
      <SettingsBrightness fontSize="small" />
    );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Box
        component="nav"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 4 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 0, sm: 1 },
                pl: 1,
                marginRight: 1,
                borderLeft: '1px solid',
                borderColor: 'divider',
              }}
            >
              <img src={logoIcon} alt="Logo" width={32} height={32} />{' '}
              <Typography
                component={Link}
                to="/"
                variant="h6"
                sx={{
                  fontWeight: 900,
                  color: 'accent.main',
                  textDecoration: 'none',
                  letterSpacing: '-0.02em',
                  fontFamily: '"Zilla Slab", serif',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                AuraIsHub
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {' '}
                <img src={callMissedIcon} alt="Call Missed" width={24} height={24} />
                <NavLink to="/" label="Dashboard" primary currentPath={location.pathname} />
              </Box>{' '}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <img src={lockIcon} alt="Lock" width={24} height={24} />
                <NavLink to="/trading" label="Trading" primary currentPath={location.pathname} />
              </Box>
            </Box>

            {!location.pathname.startsWith('/trading') && (
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  gap: 3,
                  ml: 2,
                  pl: 4,
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <NavLink to="/courses" label="Courses" currentPath={location.pathname} />
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={toggleMode} size="small" sx={{ color: 'text.secondary' }}>
              {ModeIcon}
            </IconButton>

            <IconButton
              onClick={() => navigate('/settings')}
              size="small"
              sx={{ color: 'text.secondary', display: { xs: 'flex', md: 'none' } }}
            >
              <Settings fontSize="small" />
            </IconButton>

            {user ? (
              <Box sx={{ ml: 1 }}>
                <Button
                  onClick={handleMenu}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    pl: 1,
                    pr: 0.5,
                    py: 0.5,
                    borderRadius: 9999,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    textTransform: 'none',
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ pl: 1, display: { xs: 'none', sm: 'block' } }}
                  >
                    {user.displayName || 'User'}
                  </Typography>
                  <Avatar
                    sx={{ width: 32, height: 32, border: '1px solid', borderColor: 'accent.main' }}
                  >
                    {user.displayName?.[0] || 'U'}
                  </Avatar>
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 200,
                      borderRadius: '16px',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: theme.shadows[4],
                      backgroundImage: 'none',
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem
                    onClick={() => {
                      handleClose();
                      navigate('/settings');
                    }}
                  >
                    <ListItemIcon>
                      <Settings fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Settings</ListItemText>
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    onClick={() => {
                      handleClose();
                      signOut();
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <ListItemIcon>
                      <Logout fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Button
                variant="contained"
                color="accent"
                size="small"
                onClick={signIn}
                sx={{ borderRadius: 9999, ml: 1 }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          maxWidth: 1280,
          mx: 'auto',
          width: '100%',
          px: { xs: 2, sm: 3 },
          py: 4,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
