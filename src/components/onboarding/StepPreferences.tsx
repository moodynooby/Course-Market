import { CheckCircle } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { PreferencesForm } from '../PreferencesForm';
import type { Preferences } from '../../types';

interface StepPreferencesProps {
  onComplete: (preferences: Preferences) => void;
  initialPreferences?: Preferences;
}

const DEFAULT_PREFERENCES: Preferences = {
  preferredStartTime: '08:00',
  preferredEndTime: '18:00',
  maxGapMinutes: 60,
  preferConsecutiveDays: true,
  preferMorning: false,
  preferAfternoon: false,
  maxCredits: 18,
  minCredits: 12,
  avoidDays: [],
  excludeInstructors: [],
  theme: 'system',
};

export function StepPreferences({ onComplete, initialPreferences }: StepPreferencesProps) {
  const [preferences, setPreferences] = useState<Preferences>(
    initialPreferences || DEFAULT_PREFERENCES,
  );
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleUpdate = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      setShowSuccess(true);
      setTimeout(() => {
        onComplete(preferences);
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {showSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle />}>
          Saving your preferences...
        </Alert>
      )}

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
