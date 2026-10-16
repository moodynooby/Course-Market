import { DarkMode, LightMode, SettingsBrightness } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoIcon from '../../assets/logo.png';
import { useAuthContext } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { NavLinks } from './NavLinks';
import { SemesterMenu } from './SemesterMenu';
import { UserMenu } from './UserMenu';

export function AppBarHeader() {
  const { mode, setMode } = useThemeMode();
  const { user } = useAuthContext();
  const location = useLocation();

  const toggleMode = useCallback(() => {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  }, [mode, setMode]);

  const modeTooltip =
    mode === 'light'
      ? 'Switch to dark mode'
      : mode === 'dark'
        ? 'Switch to system mode'
        : 'Switch to light mode';

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
      component="nav"
      aria-label="Primary navigation"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        bgcolor: 'background.paper',
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
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 4 }, minWidth: 0 }}>
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              textDecoration: 'none',
              pl: 0.5,
              mr: 1.5,
              '&:hover img': {
                transform: 'scale(1.06)',
              },
            }}
          >
            <Box
              component="img"
              src={logoIcon}
              alt="AuraIsHub"
              width={32}
              height={32}
              fetchPriority="high"
              sx={{
                borderRadius: '8px',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                letterSpacing: '-0.03em',
                display: { xs: 'none', sm: 'inline-flex' },
                alignItems: 'center',
              }}
            >
              AuraIs
              <Box component="span" sx={{ color: 'primary.main', ml: '1px' }}>
                Hub
              </Box>
            </Typography>
          </Box>

          <NavLinks currentPath={location.pathname} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {user && <SemesterMenu />}
          <Tooltip title={modeTooltip}>
            <IconButton
              onClick={toggleMode}
              size="small"
              sx={{ color: 'text.secondary', minWidth: 44, minHeight: 44 }}
              aria-label={modeTooltip}
            >
              {ModeIcon}
            </IconButton>
          </Tooltip>
          <UserMenu />
        </Box>
      </Box>
    </Box>
  );
}
