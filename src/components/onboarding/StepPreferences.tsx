import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import type { Preferences } from '../../types';
import { PreferencesForm } from '../PreferencesForm';

interface StepPreferencesProps {
  onComplete: (preferences: Preferences) => void;
  initialPreferences?: Preferences;
}

export function StepPreferences({ onComplete, initialPreferences }: StepPreferencesProps) {
  const [preferences, setPreferences] = useState<Preferences>(
    initialPreferences || {
      preferredStartTime: '08:00',
      preferredEndTime: '20:00',
      maxGapMinutes: 60,
      preferConsecutiveDays: false,
      preferMorning: false,
      preferAfternoon: true,
      maxCredits: 18,
      minCredits: 12,
      avoidDays: [],
      excludeInstructors: [],
    },
  );
  const [loading, setLoading] = useState(false);

  const handleUpdate = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      onComplete(preferences);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Schedule Preferences
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Customize your ideal schedule. You can always change these later.
        </Typography>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          bgcolor: 'background.paper',
        }}
      >
        <PreferencesForm preferences={preferences} onUpdate={handleUpdate} />
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="accent"
          size="large"
          fullWidth
          onClick={handleSubmit}
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Complete Onboarding'}
        </Button>
      </Box>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          These preferences will be used to generate your optimal schedule
        </Typography>
      </Box>
    </Box>
  );
}
