import { Warning } from '@mui/icons-material';
import { alpha, Box, Chip, Stack, Typography, useTheme } from '@mui/material';
import type { ScheduleDiagnostics } from '../../utils/schedule-diagnostics';

interface ScheduleDiagnosticsPanelProps {
  diagnostics: ScheduleDiagnostics;
  onSuggestionClick: (suggestion: string) => void;
}

export function ScheduleDiagnosticsPanel({
  diagnostics,
  onSuggestionClick,
}: ScheduleDiagnosticsPanelProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        maxWidth: 600,
        mx: 'auto',
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.warning.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <Warning sx={{ fontSize: 36, color: 'warning.main' }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        No Valid Schedules Found
      </Typography>

      {diagnostics.reasons.length > 0 && (
        <Stack spacing={1.5} sx={{ mb: 3, textAlign: 'left' }}>
          {diagnostics.reasons.map((reason, i) => (
            <Box
              key={i}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.05),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {reason.message}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {reason.detail}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {diagnostics.suggestions.length > 0 && (
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Suggestions
          </Typography>
          <Stack spacing={1}>
            {diagnostics.suggestions.map((suggestion, i) => (
              <Chip
                key={i}
                label={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
                variant="outlined"
                color="primary"
                sx={{
                  borderRadius: 2,
                  cursor: 'pointer',
                  height: 'auto',
                  py: 0.5,
                  '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'left' },
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {diagnostics.courseBreakdown.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Course Breakdown
          </Typography>
          <Stack spacing={1}>
            {diagnostics.courseBreakdown.map((c) => (
              <Box
                key={c.courseId}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.divider, 0.1),
                }}
              >
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {c.courseCode}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {c.totalSections} section{c.totalSections !== 1 ? 's' : ''}
                    {c.conflictingSections > 0 && (
                      <Box component="span" sx={{ color: 'error.main', ml: 1 }}>
                        ({c.conflictingSections} conflict{c.conflictingSections !== 1 ? 's' : ''})
                      </Box>
                    )}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
