import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { Psychology, GridView } from '@mui/icons-material';
import { ActionCard } from '../GlassAppBar';
import type { Schedule } from '../../types';

interface OptimizationPanelProps {
  schedule: Schedule | null;
  optimizing: boolean;
  generating: boolean;
  generationProgress: number;
  initProgress: string;
  error: string;
  webllmAvailable: boolean;
  onOptimize: () => void;
  onGenerateAll: () => void;
  onWebgpuWarning: () => void;
}

export function OptimizationPanel({
  schedule,
  optimizing,
  generating,
  generationProgress,
  initProgress,
  error,
  webllmAvailable,
  onOptimize,
  onGenerateAll,
  onWebgpuWarning,
}: OptimizationPanelProps) {
  return (
    <ActionCard sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Psychology sx={{ color: 'accent.main', fontSize: 20 }} />
        <Typography variant="h6" fontWeight={700}>
          Course Optimization
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={3}>
        Use AI to synthesize your selected courses into the perfect conflict-free timetable
      </Typography>

      <Stack spacing={2}>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            if (!webllmAvailable) {
              onWebgpuWarning();
            } else {
              onOptimize();
            }
          }}
          disabled={optimizing || !schedule || schedule.sections.length === 0}
          startIcon={<Psychology />}
          fullWidth
          sx={{
            borderRadius: 3,
            py: 1.5,
            fontWeight: 600,
          }}
        >
          {optimizing ? 'Optimizing...' : 'Optimize with AI'}
        </Button>

        <Button
          variant="outlined"
          onClick={onGenerateAll}
          disabled={generating || !schedule || schedule.sections.length === 0}
          startIcon={<GridView />}
          fullWidth
          sx={{ borderRadius: 3, py: 1.5, fontWeight: 600 }}
        >
          {generating
            ? `Generating... (${generationProgress}%)`
            : `View All Alternatives${schedule ? ` (${schedule.sections.length} courses)` : ''}`}
        </Button>

        {initProgress && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={parseFloat(initProgress.match(/\d+/)?.[0] || '0')}
              sx={{ height: 6, borderRadius: 3, mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              {initProgress}
            </Typography>
          </Box>
        )}

        {error && (
          <Typography variant="caption" color="error" display="block" textAlign="center">
            {error}
          </Typography>
        )}
      </Stack>
    </ActionCard>
  );
}
