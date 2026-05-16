import { Settings, Timer } from '@mui/icons-material';
import { Box, Button, Card, FormControl, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useConfigContext } from '../context/ConfigContext';
import { useThemeMode } from '../context/ThemeContext';
import { formatTime } from '../utils/schedule';

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

export function PreferencesSummaryCard() {
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { mode, setMode } = useThemeMode();
  const { preferences } = useConfigContext();

  const prefs = profile?.preferences || preferences;

  return (
    <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'background.paper', p: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Timer sx={{ color: 'secondary.main', fontSize: 20 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Preferences
        </Typography>
      </Stack>

      <Stack spacing={1.5}>
        <SummaryField label="Semester" value={profile?.semesterId || 'Not set'} />
        <SummaryField label="Credits" value={`${prefs.minCredits}–${prefs.maxCredits}`} />
        <SummaryField
          label="Time Window"
          value={`${formatTime(prefs.preferredStartTime)} – ${formatTime(prefs.preferredEndTime)}`}
        />
        <SummaryField
          label="Days Avoided"
          value={prefs.avoidDays.length === 0 ? 'None' : prefs.avoidDays.join(', ')}
        />

        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}
          >
            Theme
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'light' | 'dark' | 'system')}
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="system">System</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Stack>

      <Button
        variant="text"
        color="secondary"
        size="small"
        onClick={() => navigate('/settings?tab=schedule')}
        startIcon={<Settings />}
        sx={{ mt: 2, fontWeight: 600, borderRadius: 2 }}
      >
        Edit in Settings
      </Button>
    </Card>
  );
}
