import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate('/');
      } else if (error) {
        console.error('Auth error:', error);
        navigate('/login');
      }
    }
  }, [isAuthenticated, isLoading, error, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress sx={{ mb: 2 }} />
      <Typography variant="body1" color="text.secondary">
        {error ? 'Authentication failed. Redirecting...' : 'Completing sign in...'}
      </Typography>
    </Box>
  );
}
