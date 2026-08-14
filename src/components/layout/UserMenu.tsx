import { Logout } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

export function UserMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const { user, signOut, signIn } = useAuthContext();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!user) {
    return (
      <Button
        variant="contained"
        color="secondary"
        size="small"
        onClick={() => signIn(location.pathname + location.search)}
        sx={{ borderRadius: 9999, ml: 1 }}
      >
        Sign In
      </Button>
    );
  }

  return (
    <Box sx={{ ml: 1 }}>
      <Button
        onClick={handleMenu}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: 1.5,
          pr: 0.5,
          py: 0.5,
          borderRadius: 9999,
          border: 'none',
          bgcolor: 'background.paper',
          textTransform: 'none',
          color: 'text.primary',
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: 'none', md: 'block' } }}>
          {user.displayName || 'User'}
        </Typography>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            border: `2px solid`,
            borderColor: 'secondary.main',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          {user.displayName?.[0] || 'U'}
        </Avatar>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              minWidth: 200,
              borderRadius: '24px',
              border: 'none',
              backgroundImage: 'none',
              bgcolor: 'background.paper',
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
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
  );
}
