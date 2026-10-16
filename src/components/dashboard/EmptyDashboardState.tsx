import { ArrowForward, AutoAwesome } from '@mui/icons-material';
import { alpha, Box, Button, Card, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { label: 'Pick Courses', color: '#4f46e5' },
  { label: 'Set Preferences', color: '#f59e0b' },
  { label: 'Optimize Aura', color: '#10b981' },
];

export function EmptyDashboardState() {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Card
      variant="outlined"
      sx={{
        p: { xs: 3, sm: 5 },
        textAlign: 'center',
        mb: 4,
        borderRadius: 4,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          mx: 'auto',
          position: 'relative',
        }}
      >
        <AutoAwesome
          sx={{ fontSize: 40, color: 'primary.main', position: 'relative', zIndex: 1 }}
        />
      </Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
        Build Your Maximum Aura Schedule
      </Typography>
      <Typography
        sx={{ color: 'text.secondary', mb: 4, maxWidth: 520, mx: 'auto', lineHeight: 1.6 }}
      >
        Browse available courses, select your sections, and let AuraIsHub generate high-efficiency
        timetables tailored to your sleep schedule, campus walking speed, and credit targets.
      </Typography>
      <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', mb: 4, flexWrap: 'wrap' }}>
        {STEPS.map((step, index) => (
          <Box key={step.label} sx={{ textAlign: 'center', minWidth: 90 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: alpha(step.color, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1,
                fontWeight: 800,
                color: step.color,
                fontSize: '0.875rem',
              }}
            >
              {index + 1}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
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
        sx={{ px: 4, py: 1.25, fontWeight: 700 }}
      >
        Browse Courses
      </Button>
    </Card>
  );
}
