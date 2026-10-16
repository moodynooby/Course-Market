import { ArrowForward, AutoAwesome } from '@mui/icons-material';
import { alpha, Box, Button, Card, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export function EmptyDashboardState() {
  const theme = useTheme();
  const navigate = useNavigate();

  const steps = [
    { label: 'Pick Courses', color: theme.palette.primary.main },
    { label: 'Set Preferences', color: theme.palette.secondary.main },
    { label: 'Generate Timetable', color: theme.palette.warning.main },
  ];

  return (
    <Card
      variant="outlined"
      sx={{
        p: { xs: 3, sm: 5 },
        textAlign: 'center',
        mb: 4,
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: '2px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '16px',
          bgcolor: alpha(theme.palette.primary.main, 0.2),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          mx: 'auto',
          border: '2px solid',
          borderColor: alpha(theme.palette.primary.main, 0.4),
        }}
      >
        <AutoAwesome sx={{ fontSize: 36, color: 'primary.main' }} />
      </Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 800, letterSpacing: '0.6px' }}>
        Build your ideal schedule
      </Typography>
      <Typography
        sx={{
          color: 'text.secondary',
          mb: 4,
          maxWidth: 520,
          mx: 'auto',
          lineHeight: 1.6,
          fontWeight: 500,
        }}
      >
        Select your courses, tune your scheduling preferences, and generate conflict-free timetables
        tailored to your term.
      </Typography>
      <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', mb: 4, flexWrap: 'wrap' }}>
        {steps.map((step, index) => (
          <Box key={step.label} sx={{ textAlign: 'center', minWidth: 90 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                bgcolor: alpha(step.color, 0.15),
                border: `2px solid ${alpha(step.color, 0.35)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1,
                fontWeight: 800,
                color: step.color,
                fontSize: '0.9375rem',
              }}
            >
              {index + 1}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>
              {step.label}
            </Typography>
          </Box>
        ))}
      </Stack>
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={() => navigate('/courses')}
        startIcon={<ArrowForward />}
        sx={{ px: 4, py: 1.25, fontWeight: 700, borderRadius: '12px' }}
      >
        Browse Courses
      </Button>
    </Card>
  );
}
