import { CalendarToday, RemoveCircleOutline, School, Save, Timer } from '@mui/icons-material';
import {
  Box,
  Button,
  CardActions,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import type { DayOfWeek, Preferences } from '../types';
import { InfoCard } from './GlassAppBar';
import { useNotification } from '../hooks/useNotification';

interface SchedulePreferencesProps {
  initialPreferences?: Preferences;
  onSave?: (preferences: Preferences) => void | Promise<void>;
  title?: string;
  description?: string;
  autoSave?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
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
};

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'M', label: 'Mon' },
  { value: 'T', label: 'Tue' },
  { value: 'W', label: 'Wed' },
  { value: 'Th', label: 'Thu' },
  { value: 'F', label: 'Fri' },
  { value: 'Sa', label: 'Sat' },
  { value: 'Su', label: 'Sun' },
];

/**
 * Validate preferences object
 */
function validatePreferences(prefs: Preferences): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate time range
  const startMinutes = parseInt(prefs.preferredStartTime.replace(':', ''), 10);
  const endMinutes = parseInt(prefs.preferredEndTime.replace(':', ''), 10);

  if (startMinutes >= endMinutes) {
    errors.push('Start time must be before end time');
  }

  // Validate credits range
  if (prefs.minCredits > prefs.maxCredits) {
    errors.push('Min credits cannot exceed max credits');
  }

  if (prefs.minCredits < 0 || prefs.maxCredits > 24) {
    errors.push('Credits must be between 0 and 24');
  }

  // Validate max gap
  if (prefs.maxGapMinutes < 0 || prefs.maxGapMinutes > 180) {
    errors.push('Max gap must be between 0 and 180 minutes');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Unified schedule preferences component.
 * Supports both auto-save and manual save modes.
 *
 * @param autoSave - If true, saves automatically on change (no buttons)
 *                   If false, shows Save/Reset buttons
 * @param collapsible - If true, shows expand/collapse toggle
 * @param defaultExpanded - Initial expanded state when collapsible is true
 */
export function SchedulePreferences({
  initialPreferences,
  onSave,
  title = 'Schedule Preferences',
  description = 'Customize your ideal schedule settings',
  autoSave = false,
  collapsible = false,
  defaultExpanded = true,
}: SchedulePreferencesProps) {
  const theme = useTheme();
  const { showNotification } = useNotification();
  const [preferences, setPreferences] = useState<Preferences>(
    initialPreferences || DEFAULT_PREFERENCES,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Validate on mount and when preferences change
  useEffect(() => {
    const validation = validatePreferences(preferences);
    setIsValid(validation.valid);
    setValidationErrors(validation.errors);
  }, [preferences]);

  // Auto-save on preference change (debounced)
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    const validation = validatePreferences(preferences);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      await onSave(preferences);
      setSaved(true);
      if (!autoSave) {
        showNotification('Preferences saved!', 'success');
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showNotification('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  }, [preferences, onSave, autoSave, showNotification]);

  useEffect(() => {
    if (!autoSave || !onSave) return;

    const timer = setTimeout(() => {
      if (isValid) {
        handleSave();
      }
    }, 5000); // 5 second debounce

    return () => clearTimeout(timer);
  }, [handleSave, autoSave, onSave, isValid]);

  const handleUpdate = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaved(false);
  };

  const handleDayToggle = (day: DayOfWeek) => {
    const current = preferences.avoidDays;
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    handleUpdate('avoidDays', updated);
  };

  const handleInstructorChange = (value: string) => {
    const instructors = value
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
    handleUpdate('excludeInstructors', instructors);
  };

  const handleCreditsChange = (type: 'min' | 'max', value: number) => {
    const clampedValue = Math.max(0, Math.min(24, value));
    if (type === 'min') {
      handleUpdate('minCredits', Math.min(clampedValue, preferences.maxCredits));
    } else {
      handleUpdate('maxCredits', Math.max(clampedValue, preferences.minCredits));
    }
  };

  const handleReset = () => {
    setPreferences(initialPreferences || DEFAULT_PREFERENCES);
    setSaved(false);
    setValidationErrors([]);
  };

  const showActions = !autoSave;

  return (
    <InfoCard sx={{ p: 3 }}>
      {collapsible ? (
        <Box sx={{ mb: 3, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {description}
                {autoSave && ' • Auto-saves as you edit'}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500, ml: 'auto' }}
            >
              {expanded ? '− Collapse' : '+ Expand'}
            </Typography>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
            {autoSave && ' • Auto-saves as you edit'}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          maxHeight: expanded ? '2000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
          opacity: expanded ? 1 : 0,
        }}
      >
        <Stack spacing={3}>
          {/* Time Preferences */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={1.5}>
              <Timer fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                TIME PREFERENCES
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="time"
                  label="Start Time"
                  value={preferences.preferredStartTime}
                  onChange={(e) => handleUpdate('preferredStartTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="time"
                  label="End Time"
                  value={preferences.preferredEndTime}
                  onChange={(e) => handleUpdate('preferredEndTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} mt={2}>
              <Chip
                label="🌅 Morning"
                onClick={() => handleUpdate('preferMorning', !preferences.preferMorning)}
                color={preferences.preferMorning ? 'primary' : 'default'}
                variant={preferences.preferMorning ? 'filled' : 'outlined'}
                sx={{ fontSize: '0.75rem' }}
              />
              <Chip
                label="🌇 Afternoon"
                onClick={() => handleUpdate('preferAfternoon', !preferences.preferAfternoon)}
                color={preferences.preferAfternoon ? 'primary' : 'default'}
                variant={preferences.preferAfternoon ? 'filled' : 'outlined'}
                sx={{ fontSize: '0.75rem' }}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Credit & Schedule */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={1.5}>
              <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                SCHEDULE
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Min Credits"
                  value={preferences.minCredits}
                  onChange={(e) => handleCreditsChange('min', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 24 }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Max Credits"
                  value={preferences.maxCredits}
                  onChange={(e) => handleCreditsChange('max', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 24 }}
                />
              </Grid>
            </Grid>

            <Box mt={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" color="text.secondary">
                  Max Gap Between Classes
                </Typography>
                <Chip
                  label={`${preferences.maxGapMinutes} min`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
              <Slider
                value={preferences.maxGapMinutes}
                onChange={(_, value) => handleUpdate('maxGapMinutes', value as number)}
                min={0}
                max={180}
                step={15}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} min`}
                sx={{
                  '& .MuiSlider-thumb': {
                    width: 18,
                    height: 18,
                  },
                  '& .MuiSlider-track': {
                    bgcolor: 'primary.main',
                  },
                  '& .MuiSlider-rail': {
                    opacity: 0.3,
                  },
                  '& .MuiSlider-valueLabel': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontWeight: 600,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  },
                }}
              />
            </Box>

            <Box mt={2}>
              <Typography variant="caption" color="text.secondary" mb={1} display="block">
                Days to Avoid
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {DAYS.map((day) => {
                  const isActive = preferences.avoidDays.includes(day.value);
                  return (
                    <Chip
                      key={day.value}
                      label={day.label}
                      onClick={() => handleDayToggle(day.value)}
                      color={isActive ? 'error' : 'default'}
                      variant={isActive ? 'filled' : 'outlined'}
                      size="small"
                      sx={{
                        fontWeight: isActive ? 600 : 500,
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[1],
                          bgcolor: isActive ? 'error.dark' : 'action.hover',
                        },
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.preferConsecutiveDays}
                  onChange={(e) => handleUpdate('preferConsecutiveDays', e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Prefer consecutive days (MWF or TTh)
                </Typography>
              }
              sx={{ mt: 1, ml: 0 }}
            />
          </Box>

          <Divider />

          {/* Instructor Preferences */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={1.5}>
              <School fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                INSTRUCTORS
              </Typography>
            </Stack>

            <TextField
              fullWidth
              size="small"
              placeholder="Dr. Smith, Prof. Jones"
              value={preferences.excludeInstructors.join(', ')}
              onChange={(e) => handleInstructorChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <RemoveCircleOutline fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
              helperText="Separate multiple names with commas"
            />
          </Box>
        </Stack>

        {/* Validation Errors */}
        {!isValid && validationErrors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {validationErrors.map((error, index) => (
              <Typography
                key={index}
                variant="caption"
                color="error"
                display="block"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                ⚠️ {error}
              </Typography>
            ))}
          </Box>
        )}

        {/* Action Buttons (only in manual save mode) */}
        {showActions && (
          <CardActions
            sx={{
              pt: 3,
              mt: 2,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              justifyContent: 'space-between',
            }}
          >
            <Button onClick={handleReset} variant="outlined" disabled={saving || saved}>
              Reset
            </Button>
            <Stack direction="row" spacing={2}>
              {saved && (
                <Typography
                  variant="body2"
                  color="success.main"
                  sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}
                >
                  ✓ Saved!
                </Typography>
              )}
              <Button
                onClick={handleSave}
                variant="contained"
                color="accent"
                disabled={saving || saved || !isValid}
                startIcon={saving ? undefined : <Save />}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                }}
              >
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </Button>
            </Stack>
          </CardActions>
        )}

        {/* Auto-save status indicator */}
        {autoSave && saved && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Typography
              variant="body2"
              color="success.main"
              sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}
            >
              ✓ Saved
            </Typography>
          </Box>
        )}
      </Box>
    </InfoCard>
  );
}
