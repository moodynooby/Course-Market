import { School } from '@mui/icons-material';
import { Avatar, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useAuthContext } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuthContext();

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
              Optimize your semester with AI
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ mb: 4 }}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              size="large"
              onClick={signIn}
              sx={{ py: 1.5 }}
            >
              Sign in
            </Button>

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
                Why Sign In?
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'text.secondary' }}>
                <li>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    Swap course sections with other students
                  </Typography>
                </li>
                <li>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    Sync your schedule across all devices
                  </Typography>
                </li>
                <li>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    Save your optimization preferences
                  </Typography>
                </li>
                <li>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    Get Free AI ADVICE totally private if you device supports it or a free of cost
                    ai service
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
