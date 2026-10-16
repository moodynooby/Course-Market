import { alpha, Box, Button, Chip, Stack, Typography, useTheme } from '@mui/material';
import type { Course } from '../../types';
import { SCORE_EXCELLENT } from '../../utils/constants';
import type { GeneratedSchedule } from '../../utils/schedule-types';
import CalendarView from '../CalendarView';

interface ScheduleDetailsProps {
  selectedSchedule: GeneratedSchedule;
  courses: Course[];
  onApply: () => void;
  similarSectionCounts?: Map<string, number>;
}

export function ScheduleDetails({
  selectedSchedule,
  courses,
  onApply,
  similarSectionCounts,
}: ScheduleDetailsProps) {
  const theme = useTheme();

  return (
    <Stack sx={{ p: 3, height: '100%', position: 'relative' }}>
      <Box sx={{ overflow: 'auto', pb: 7 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Schedule Details
          </Typography>
          <Chip
            label={`Score: ${selectedSchedule.score} • ${
              selectedSchedule.score >= SCORE_EXCELLENT
                ? '✨ Peak Aura'
                : selectedSchedule.score >= 60
                  ? '⚡ Strong Flow'
                  : '⚠️ Conflicts'
            }`}
            color={
              selectedSchedule.score >= SCORE_EXCELLENT
                ? 'success'
                : selectedSchedule.score >= 60
                  ? 'primary'
                  : 'warning'
            }
            sx={{ borderRadius: 2, fontWeight: 700 }}
          />
          <Chip
            label={`${selectedSchedule.totalCredits} Credits`}
            variant="outlined"
            sx={{ borderRadius: 2, fontWeight: 600 }}
          />
        </Stack>

        <Box sx={{ height: { xs: 360, sm: 480 }, mb: 2 }}>
          <CalendarView
            sections={selectedSchedule.sections}
            courses={courses}
            conflicts={selectedSchedule.conflicts}
            similarSectionCounts={similarSectionCounts}
          />
        </Box>

        {selectedSchedule.conflicts.length > 0 && (
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
              ⚠️ Conflicts:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {selectedSchedule.conflicts.map((conflict) => (
                <li key={conflict}>
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>
                    {conflict}
                  </Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          pt: 2,
          bgcolor: 'background.paper',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          sx={{ borderRadius: 3, py: 1.5, fontWeight: 600 }}
          onClick={onApply}
        >
          Apply This Schedule
        </Button>
      </Box>
    </Stack>
  );
}
