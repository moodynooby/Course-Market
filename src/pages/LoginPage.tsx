import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Google,
  GitHub,
  PhoneAndroid,
  School,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithGithub, signInWithPhone, loading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      console.error('Google sign in failed:', error);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await signInWithGithub();
      navigate('/');
    } catch (error) {
      console.error('GitHub sign in failed:', error);
    }
  };

  const handlePhoneSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    
    // Basic phone validation
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    
    signInWithPhone(phoneNumber).then(() => {
      navigate('/');
    });
  };

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
            <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
              Course Hub
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to access your courses and connect with other students
            </Typography>
          </Box>

          <Stack spacing={2}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Google />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{ py: 1.5 }}
            >
              Continue with Google
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GitHub />}
              onClick={handleGithubSignIn}
              disabled={loading}
              sx={{ py: 1.5 }}
            >
              Continue with GitHub
            </Button>

            <Divider>
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
            </Divider>

            <Box component="form" onSubmit={handlePhoneSignIn}>
              <TextField
                fullWidth
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                error={!!phoneError}
                helperText={phoneError}
                InputProps={{
                  startAdornment: <PhoneAndroid sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !phoneNumber}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign in with Phone'}
              </Button>
            </Box>
          </Stack>

          <Alert severity="info" sx={{ mt: 3 }}>
            By signing in, you agree to our Terms of Service and Privacy Policy.
            Your data is stored securely and never shared with third parties.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}