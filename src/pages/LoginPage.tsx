import { School } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { signIn, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: 'primary.main',
                mx: 'auto',
                mb: 2,
              }}
            >
              <School sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              fontWeight={700}
              sx={{ fontFamily: '"Zilla Slab", serif' }}
            >
              AuraIsHub
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Optimize your semester with AI
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ mb: 4 }}>
            <Button fullWidth variant="contained" size="large" onClick={signIn} sx={{ py: 1.5 }}>
              Sign in to Trade & Sync
            </Button>

            <Box sx={{ px: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
                sx={{ mb: 1, fontWeight: 600 }}
              >
                Why Sign In?
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'text.secondary' }}>
                <li>
                  <Typography variant="caption" color="text.secondary">
                    Swap course sections with other students
                  </Typography>
                </li>
                <li>
                  <Typography variant="caption" color="text.secondary">
                    Sync your schedule across all devices
                  </Typography>
                </li>
                <li>
                  <Typography variant="caption" color="text.secondary">
                    Save your optimization preferences
                  </Typography>
                </li>
              </ul>
            </Box>
          </Stack>

          <Box sx={{ bgcolor: 'action.hover', p: 3, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Just Planning?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Continue as a guest to browse courses and use the AI optimizer. No account required to
              start.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/courses')} fullWidth>
              Start as Guest
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
