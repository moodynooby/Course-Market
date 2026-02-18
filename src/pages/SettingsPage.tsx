import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Divider,
  Alert,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Save,
  Phone,
  DarkMode,
  Palette,
  AccountCircle,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import type { UserPreference } from '../types';

function PreferencesForm() {
  const { updatePhoneNumber } = useAuth();
  const { mode, setMode } = useThemeMode();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saved, setSaved] = useState(false);

  const [preferences, setPreferences] = useState<UserPreference>({
    userId: '',
    displayName: '',
    preferredStartTime: '08:00',
    preferredEndTime: '17:00',
    maxGapMinutes: 60,
    preferConsecutiveDays: true,
    preferMorning: false,
    preferAfternoon: false,
    maxCredits: 18,
    minCredits: 12,
    avoidDays: [],
    excludeInstructors: [],
    theme: mode,
  });

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem('user-preferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setPreferences(prefs);
      } catch {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('user-preferences', JSON.stringify(preferences));
    setMode(preferences.theme || 'system');
    
    if (phoneNumber) {
      updatePhoneNumber(phoneNumber);
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const { user } = useAuth();

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Avatar sx={{ width: 48, height: 48 }}>
          {user?.displayName?.[0] || user?.email?.[0] || 'U'}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {user?.displayName || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
      </Stack>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <AccountCircle color="primary" />
                <Typography variant="h6">Profile Settings</Typography>
              </Stack>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Display Name"
                    value={preferences.displayName || user?.displayName || ''}
                    onChange={(e) => setPreferences({ ...preferences, displayName: e.target.value })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    value={user?.email || ''}
                    disabled
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    fullWidth
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={mode}
                      label="Theme"
                      onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as any })}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="system">System</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Palette color="primary" />
                <Typography variant="h6">Schedule Preferences</Typography>
              </Stack>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Preferred Start Time"
                    type="time"
                    value={preferences.preferredStartTime}
                    onChange={(e) => setPreferences({ ...preferences, preferredStartTime: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Preferred End Time"
                    type="time"
                    value={preferences.preferredEndTime}
                    onChange={(e) => setPreferences({ ...preferences, preferredEndTime: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Min Credits"
                    type="number"
                    value={preferences.minCredits}
                    onChange={(e) => setPreferences({ ...preferences, minCredits: parseInt(e.target.value) || 0 })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Max Credits"
                    type="number"
                    value={preferences.maxCredits}
                    onChange={(e) => setPreferences({ ...preferences, maxCredits: parseInt(e.target.value) || 24 })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Max Gap (minutes)"
                    type="number"
                    value={preferences.maxGapMinutes}
                    onChange={(e) => setPreferences({ ...preferences, maxGapMinutes: parseInt(e.target.value) || 0 })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.preferMorning}
                          onChange={(e) => setPreferences({ ...preferences, preferMorning: e.target.checked })}
                        />
                      }
                      label="Prefer Morning Classes"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.preferAfternoon}
                          onChange={(e) => setPreferences({ ...preferences, preferAfternoon: e.target.checked })}
                        />
                      }
                      label="Prefer Afternoon Classes"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.preferConsecutiveDays}
                          onChange={(e) => setPreferences({ ...preferences, preferConsecutiveDays: e.target.checked })}
                        />
                      }
                      label="Prefer Consecutive Days"
                    />
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Advanced Settings
              </Typography>
              
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>LLM Provider</InputLabel>
                  <Select
                    defaultValue="webllm"
                    label="LLM Provider"
                  >
                    <MenuItem value="webllm">WebLLM (Browser-based)</MenuItem>
                    <MenuItem value="local">Local LLM (Ollama)</MenuItem>
                    <MenuItem value="disabled">Disabled</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    if (confirm('This will clear all your data. Are you sure?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                >
                  Clear All Data
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={handleSave}
        >
          Save Settings
        </Button>
      </Stack>
    </Box>
  );
}

export default function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Settings
      </Typography>
      <PreferencesForm />
    </Box>
  );
}