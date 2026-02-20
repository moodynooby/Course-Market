import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Button,
  Divider,
  SvgIcon,
  useTheme,
  useMediaQuery,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Menu as MenuIcon,
  School,
  CalendarMonth,
  SwapHoriz,
  Settings,
  DarkMode,
  LightMode,
  Upload,
  SettingsBrightness,
} from '@mui/icons-material';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import ImportDialog from './ImportDialog';

const drawerWidth = 240;

const navItems = [
  { text: 'Courses', icon: <School />, path: '/courses' },
  { text: 'Schedule', icon: <CalendarMonth />, path: '/schedule' },
  { text: 'Trading', icon: <SwapHoriz />, path: '/trading' },
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useThemeMode();
  const { user, signOut } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };



  const drawer = (
    <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <img src="/apple-touch-icon.png" alt="Logo" style={{ width: 32, height: 32 }} />
        <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.main', fontFamily: '"Zilla Slab", serif' }}>
          AuraIsHub
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flex: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setImportOpen(true);
              if (isMobile) setMobileOpen(false);
            }}
            sx={{ mx: 1, my: 0.5, borderRadius: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Upload />
            </ListItemIcon>
            <ListItemText primary="Import" />
          </ListItemButton>
        </ListItem>
        <Divider sx={{ mx: 2, my: 0.5 }} />
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Theme
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, newMode) => newMode && setMode(newMode)}
          size="small"
          fullWidth
        >
          <ToggleButton value="light" sx={{ py: 1 }}>
            <LightMode sx={{ mr: 0.5 }} />
          </ToggleButton>
          <ToggleButton value="dark" sx={{ py: 1 }}>
            <DarkMode sx={{ mr: 0.5 }} />
          </ToggleButton>
          <ToggleButton value="system" sx={{ py: 1 }}>
            <SettingsBrightness sx={{ mr: 0.5 }} />
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`}
          target="_blank"
          variant="outlined"
          size="small"
          fullWidth
          startIcon={
            <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: 20 }}>
              <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z" />
            </SvgIcon>
          }
          sx={{ mt: 2, mb: 1 }}
        >
          Support
        </Button>
        <Button
          href={APP_CONFIG.KOFI_URL}
          target="_blank"
          variant="outlined"
          size="small"
          fullWidth
          startIcon={
            <SvgIcon viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </SvgIcon>
          }
          sx={{ mt: 2, mb: 1 }}
        >
          Contact
        </Button>

        <Box
          sx={{
            display: 'flex',
            marginTop: 1,
            alignItems: 'center',
            gap: 1.5,
            p: 1,
            borderRadius: 2,
            bgcolor: 'action.hover',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/settings')}
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
            {user?.displayName?.[0] || 'U'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <ListItemText
              primary={user?.displayName || 'User'}
              secondary={user?.phoneNumber}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
              secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mb: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Outlet />
      </Box>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </Box>
  );
}
