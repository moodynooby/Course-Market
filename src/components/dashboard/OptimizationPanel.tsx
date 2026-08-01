import { AutoAwesome, GridView } from '@mui/icons-material';
import { Button, Card, Stack, Typography } from '@mui/material';
import type { Schedule } from '../../types';

interface OptimizationPanelProps {
  schedule: Schedule | null;
  optimizing: boolean;
  generating: boolean;
  generationProgress: number;
  error: string;
  onOptimize: () => void;
  onGenerateAll: () => void;
}

export function OptimizationPanel({
  schedule,
  optimizing,
  generating,
  generationProgress,
  error,
  onOptimize,
  onGenerateAll,
}: OptimizationPanelProps) {
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 4, bgcolor: 'background.paper', transition: 'all 0.3s ease', p: 3 }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 2,
        }}
      >
        <AutoAwesome sx={{ color: 'secondary.main', fontSize: 20 }} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
          }}
        >
          Course Optimization
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          mb: 3,
        }}
      >
        Find the best conflict-free timetable from your selected courses
      </Typography>
      <Stack spacing={2}>
        <Button
          variant="contained"
          color="secondary"
          onClick={onOptimize}
          disabled={optimizing || !schedule || schedule.sections.length === 0}
          startIcon={<AutoAwesome />}
          fullWidth
          sx={{
            borderRadius: 3,
            py: 1.5,
            fontWeight: 600,
          }}
        >
          {optimizing ? 'Finding best schedule...' : 'Find Best Schedule'}
        </Button>

        <Button
          variant="outlined"
          onClick={onGenerateAll}
          disabled={generating || !schedule || schedule.sections.length === 0}
          startIcon={<GridView />}
          fullWidth
          sx={{ borderRadius: 3, py: 1.5, fontWeight: 600 }}
        >
          {generating ? `Generating... (${generationProgress}%)` : 'View All Alternatives'}
        </Button>

        {error && (
          <Typography
            variant="caption"
            color="error"
            sx={{
              display: 'block',
              textAlign: 'center',
            }}
          >
            {error}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
