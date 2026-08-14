import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { AppBarHeader } from './layout/AppBarHeader';
import { MobileNav } from './layout/MobileNav';

export default function Layout() {
  const { user } = useAuthContext();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <AppBarHeader />
      {user && <MobileNav />}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          maxWidth: 1280,
          mx: 'auto',
          width: '100%',
          px: { xs: 2, sm: 3 },
          py: 4,
          pb: { xs: 8, md: 4 },
        }}
      >
        <Outlet />
      </Box>
      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          py: 2,
          color: 'text.secondary',
          fontSize: '0.8rem',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', md: 'block' },
        }}
      >
        Made with ❤️ by Manas Doshi (AU25040285). Contact me for any help ^_^.
      </Box>
    </Box>
  );
}
