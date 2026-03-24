import { AccessTime, CalendarToday, RemoveCircleOutline, School, Timer } from '@mui/icons-material';
import {
  Box,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import type { DayOfWeek, Preferences } from '../types';

interface PreferencesFormProps {
  preferences: Preferences;
  onUpdate: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'M', label: 'Mon' },
  { value: 'T', label: 'Tue' },
  { value: 'W', label: 'Wed' },
  { value: 'Th', label: 'Thu' },
  { value: 'F', label: 'Fri' },
  { value: 'Sa', label: 'Sat' },
  { value: 'Su', label: 'Sun' },
];

export function PreferencesForm({ preferences, onUpdate }: PreferencesFormProps) {
  const theme = useTheme();

  const handleDayToggle = (day: DayOfWeek) => {
    const current = preferences.avoidDays;
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    onUpdate('avoidDays', updated);
  };

  const handleInstructorChange = (value: string) => {
    const instructors = value
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
    onUpdate('excludeInstructors', instructors);
  };

  const handleCreditsChange = (type: 'min' | 'max', value: number) => {
    const clampedValue = Math.max(0, Math.min(24, value));
    if (type === 'min') {
      onUpdate('minCredits', Math.min(clampedValue, preferences.maxCredits));
    } else {
      onUpdate('maxCredits', Math.max(clampedValue, preferences.minCredits));
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <AccessTime sx={{ color: 'accent.main', fontSize: 20 }} />
        <Typography variant="h6" fontWeight={700}>
          Schedule Preferences
        </Typography>
      </Stack>

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
                onChange={(e) => onUpdate('preferredStartTime', e.target.value)}
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
                onChange={(e) => onUpdate('preferredEndTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} mt={2}>
            <Chip
              label="🌅 Morning"
              onClick={() => onUpdate('preferMorning', !preferences.preferMorning)}
              color={preferences.preferMorning ? 'primary' : 'default'}
              variant={preferences.preferMorning ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.75rem' }}
            />
            <Chip
              label="🌇 Afternoon"
              onClick={() => onUpdate('preferAfternoon', !preferences.preferAfternoon)}
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
              <Typography variant="caption" fontWeight={600} color="accent.main">
                {preferences.maxGapMinutes} min
              </Typography>
            </Stack>
            <Slider
              value={preferences.maxGapMinutes}
              onChange={(_, value) => onUpdate('maxGapMinutes', value as number)}
              min={0}
              max={180}
              step={15}
              valueLabelDisplay="off"
              sx={{
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
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
                      fontWeight: isActive ? 600 : 400,
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
                onChange={(e) => onUpdate('preferConsecutiveDays', e.target.checked)}
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
    </Box>
  );
}
