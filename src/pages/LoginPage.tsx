import { School } from '@mui/icons-material';
import { Avatar, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { consumeAuthReturnContext } from '../hooks/useAuthGuard';

export default function LoginPage() {
  const { signIn } = useAuthContext();
  const { returnUrl, actionLabel } = consumeAuthReturnContext();

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
      <Card variant="outlined" sx={{ maxWidth: 450, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: 'secondary.main',
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
              sx={{
                fontWeight: 700,
              }}
            >
              AuraIsHub
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                mb: 1,
              }}
            >
              Plan your semester with confidence
            </Typography>

            {actionLabel && (
              <Typography
                variant="subtitle1"
                sx={{
                  mt: 2,
                  color: 'primary.main',
                  fontWeight: 600,
                }}
              >
                Sign in to {actionLabel}
              </Typography>
            )}
          </Box>

          <Stack spacing={2} sx={{ mb: 4 }}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              size="large"
              onClick={() => signIn(returnUrl ?? undefined)}
              sx={{ py: 1.5 }}
            >
              Sign in
            </Button>

            <Typography variant="body2" align="center" sx={{ color: 'text.secondary' }}>
              <RouterLink to="/" style={{ color: 'inherit', textDecoration: 'underline' }}>
                Continue browsing without signing in
              </RouterLink>
            </Typography>

            <Box sx={{ px: 1 }}>
              <Typography
                variant="caption"
                component="div"
                sx={{
                  color: 'text.secondary',
                  mb: 1,
                  fontWeight: 600,
                }}
              >
                What signing in unlocks
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Save schedules and sync them across devices
                  </Typography>
                </li>
                <li>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Trade course sections with other students
                  </Typography>
                </li>
                <li>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Rate professors and share your reviews
                  </Typography>
                </li>
              </ul>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
