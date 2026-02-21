import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
} from '@mui/material';
import { School, PhoneAndroid, Person } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState({ name: '', phone: '' });
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ name: '', phone: '' });

    // Validation
    if (!displayName.trim()) {
      setErrors((prev) => ({ ...prev, name: 'Name is required' }));
      return;
    }

    if (!phoneNumber.trim()) {
      setErrors((prev) => ({ ...prev, phone: 'Phone number is required' }));
      return;
    }

    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrors((prev) => ({ ...prev, phone: 'Please enter a valid phone number' }));
      return;
    }

    try {
      await login(displayName, phoneNumber);
      navigate('/');
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Login failed:', err);
      }
    }
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
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              fontWeight={700}
              sx={{ fontFamily: '"Zilla Slab", serif' }}
            >
              AuraIsHub
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to access your courses and connect with other students
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Full Name"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                disabled={loading}
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              <TextField
                fullWidth
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                error={!!errors.phone}
                helperText={errors.phone}
                disabled={loading}
                InputProps={{
                  startAdornment: <PhoneAndroid sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !displayName.trim() || !phoneNumber.trim()}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </Stack>
          </Box>

          <Alert severity="info">
            By signing in, you agree to our Terms of Service and Privacy Policy. Your data is stored
            securely in your browser.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
