import { Close, Tune } from '@mui/icons-material';
import {
  alpha,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  useTheme,
} from '@mui/material';
import type { Preferences } from '../../types';
import { SchedulePreferences } from '../SchedulePreferences';

interface PreferencesDialogProps {
  open: boolean;
  onClose: () => void;
  initialPreferences: Preferences;
  onSave: (preferences: Preferences) => void | Promise<void>;
}

export function PreferencesDialog({
  open,
  onClose,
  initialPreferences,
  onSave,
}: PreferencesDialogProps) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Tune sx={{ color: 'secondary.main' }} />
            Schedule Preferences
          </Stack>
          <IconButton onClick={onClose} aria-label="Close preferences">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <SchedulePreferences
          initialPreferences={initialPreferences}
          onSave={onSave}
          autoSave={true}
          collapsible={false}
          defaultExpanded={true}
          description="Choose the timetable criteria used to rank your alternatives."
        />
      </DialogContent>
    </Dialog>
  );
}
