import { AutoAwesome, GridView, Undo } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Schedule } from '../../types';

interface OptimizationPanelProps {
  schedule: Schedule | null;
  optimizing: boolean;
  generating: boolean;
  generationProgress: number;
  error: string;
  onOptimize: () => void;
  onGenerateAll: () => void;
  onClearError?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

export function OptimizationPanel({
  schedule,
  optimizing,
  generating,
  generationProgress,
  error,
  onOptimize,
  onGenerateAll,
  onClearError,
  onUndo,
  canUndo,
}: OptimizationPanelProps) {
  const hasCourses = Boolean(schedule && schedule.sections.length > 0);
  const disabledReason = !hasCourses
    ? 'Select at least one course with scheduled sections to generate alternatives.'
    : '';

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '14px',
        bgcolor: 'background.paper',
        border: '2px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        p: 3,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 1,
        }}
      >
        <AutoAwesome sx={{ color: 'secondary.main', fontSize: 20 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Course Optimization
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        Automatically resolve section conflicts and find the best timetable based on your
        preferences.
      </Typography>

      <Stack spacing={2} aria-busy={generating || optimizing}>
        {/* Primary Action: Explore All Alternatives */}
        <Tooltip title={disabledReason} arrow>
          <span>
            <Button
              variant="contained"
              color="secondary"
              onClick={onGenerateAll}
              disabled={generating || !hasCourses}
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <GridView />}
              fullWidth
              sx={{
                borderRadius: '12px',
                py: 1.5,
                fontWeight: 700,
                boxShadow: '0 3px 0 #028ce0',
                '&:active': {
                  transform: 'translateY(2px)',
                  boxShadow: '0 1px 0 #027bc4',
                },
              }}
            >
              {generating ? 'Generating Alternatives...' : 'Explore All Alternatives'}
            </Button>
          </span>
        </Tooltip>

        {/* Progress indicator during alternative generation */}
        {generating && (
          <Box sx={{ width: '100%', mt: 0.5 }} role="status" aria-live="polite">
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Analyzing timetable combinations...
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                {generationProgress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={generationProgress}
              color="secondary"
              sx={{ borderRadius: '6px', height: 8 }}
            />
          </Box>
        )}

        {/* Secondary Action: Auto-Optimize Best Schedule */}
        <Tooltip title={disabledReason} arrow>
          <span>
            <Button
              variant="outlined"
              onClick={onOptimize}
              disabled={optimizing || !hasCourses}
              startIcon={
                optimizing ? <CircularProgress size={18} color="inherit" /> : <AutoAwesome />
              }
              fullWidth
              sx={{
                borderRadius: '12px',
                py: 1.5,
                fontWeight: 600,
                borderWidth: '2px',
                '&:hover': { borderWidth: '2px' },
              }}
            >
              {optimizing ? 'Optimizing timetable...' : 'Auto-Optimize Schedule'}
            </Button>
          </span>
        </Tooltip>

        {/* Undo Action if available */}
        {canUndo && onUndo && (
          <Button
            variant="text"
            size="small"
            onClick={onUndo}
            startIcon={<Undo />}
            sx={{ borderRadius: '12px', fontWeight: 600, alignSelf: 'center' }}
          >
            Revert to Previous Schedule
          </Button>
        )}

        {/* Error notification */}
        {error && (
          <Alert
            severity="error"
            variant="outlined"
            onClose={onClearError}
            role="alert"
            sx={{ borderRadius: '12px' }}
          >
            {error}
          </Alert>
        )}
      </Stack>
    </Card>
  );
}
