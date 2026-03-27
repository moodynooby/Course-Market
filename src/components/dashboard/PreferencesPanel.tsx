import { Box, Stack, Typography } from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { useState } from 'react';
import { ActionCard } from '../GlassAppBar';
import { PreferencesForm } from '../PreferencesForm';
import type { Preferences } from '../../types';

interface PreferencesPanelProps {
  preferences: Preferences;
  onUpdate: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

export function PreferencesPanel({ preferences, onUpdate }: PreferencesPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <ActionCard
      sx={{
        p: 3,
        transition: 'all 0.3s ease',
        ...(expanded && {
          bgcolor: 'surface.containerHighest',
        }),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        mb={2}
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <AccessTime sx={{ color: 'accent.main', fontSize: 20 }} />
        <Typography variant="h6" fontWeight={700}>
          Schedule Preferences
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontWeight: 500 }}>
          {expanded ? '− Collapse' : '+ Expand'}
        </Typography>
      </Stack>

      {(expanded || Object.keys(preferences.avoidDays).length > 0) && (
        <Box
          sx={{
            maxHeight: expanded ? '1000px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}
        >
          <PreferencesForm
            preferences={preferences}
            onUpdate={(key, value) => {
              onUpdate(key, value);
              setExpanded(true);
            }}
          />
        </Box>
      )}
    </ActionCard>
  );
}
