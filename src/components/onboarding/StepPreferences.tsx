import { CheckCircle } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import { useConfigContext } from '../../context/ConfigContext';
import type { Preferences } from '../../types';
import { PreferencesForm } from '../PreferencesForm';

interface StepPreferencesProps {
  onComplete: (preferences: Preferences) => void;
  initialPreferences?: Preferences;
}

export function StepPreferences({ onComplete, initialPreferences }: StepPreferencesProps) {
  const { preferences: contextPreferences } = useConfigContext();
  const [preferences, setPreferences] = useState<Preferences>(
    initialPreferences || contextPreferences,
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
