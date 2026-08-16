import { ArrowForward, AutoAwesome } from '@mui/icons-material';
import { alpha, Box, Button, Card, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { label: 'Browse', colorKey: 'primary' as const },
  { label: 'Select', colorKey: 'secondary' as const },
  { label: 'Optimize', colorKey: 'secondary' as const },
];

export function EmptyDashboardState() {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Card
      variant="outlined"
      sx={{ p: 5, textAlign: 'center', mb: 4, borderRadius: 6, bgcolor: 'background.paper' }}
    >
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.secondary?.main || theme.palette.secondary.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          mx: 'auto',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.secondary?.main || theme.palette.secondary.main, 0.3),
            filter: 'blur(12px)',
            position: 'absolute',
          }}
        />
        <AutoAwesome
          sx={{ fontSize: 48, color: 'secondary.main', position: 'relative', zIndex: 1 }}
        />
      </Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Build Your Perfect Schedule
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 4, maxWidth: 500, mx: 'auto' }}>
        Browse available courses, select your preferred sections, and find the timetable that best
        matches your preferences.
      </Typography>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', mb: 4 }}>
        {STEPS.map((step, index) => (
          <Box key={step.label} sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette[step.colorKey].main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1,
                fontWeight: 700,
                color: theme.palette[step.colorKey].main,
              }}
            >
              {index + 1}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {step.label}
            </Typography>
          </Box>
        ))}
      </Stack>
      <Button
        variant="contained"
        color="secondary"
        size="large"
        onClick={() => navigate('/courses')}
        startIcon={<ArrowForward />}
      >
        Browse Courses
      </Button>
    </Card>
  );
}
