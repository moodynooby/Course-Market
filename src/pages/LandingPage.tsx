import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Avatar,
  Chip,
} from '@mui/material';
import {
  School,
  Upload,
  CalendarMonth,
  SwapHoriz,
  ArrowForward,
  AutoAwesome,
} from '@mui/icons-material';

const steps = [
  {
    icon: <Upload sx={{ fontSize: 28 }} />,
    title: 'Import Your Courses',
    description:
      'Download the CSV from the Course Directory or Registration page — look for the export button next to your school name. Then upload it here.',
    path: '/courses',
  },
  {
    icon: <School sx={{ fontSize: 28 }} />,
    title: 'Browse & Select',
    description: 'Search courses, compare sections, and pick the ones that fit your schedule.',
    path: '/courses',
  },
  {
    icon: <CalendarMonth sx={{ fontSize: 28 }} />,
    title: 'Optimize Your Schedule',
    description: 'Use the AI optimizer to find the best schedule based on your preferences.',
    path: '/schedule',
  },
  {
    icon: <SwapHoriz sx={{ fontSize: 28 }} />,
    title: 'Trade Sections',
    description: 'Swap course sections with other students to get your ideal timetable.',
    path: '/trading',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: 'primary.main',
            mx: 'auto',
            mb: 2,
          }}
        >
          <AutoAwesome sx={{ fontSize: 32 }} />
        </Avatar>
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom
          sx={{ fontFamily: '"Zilla Slab", serif' }}
        >
          Welcome to AuraIsHub
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto' }}>
          Import your courses, pick your sections, then trade with others. Already know what you
          want? Jump straight to trading below.
        </Typography>
      </Box>

      <Stack spacing={2} sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
        {steps.map((step, index) => (
          <Card
            key={step.title}
            sx={{
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'primary.main' },
            }}
            variant="outlined"
            onClick={() => navigate(step.path)}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
              <Chip
                label={index + 1}
                size="small"
                color="primary"
                sx={{ fontWeight: 700, minWidth: 28 }}
              />
              <Avatar sx={{ bgcolor: 'action.hover', color: 'primary.main' }}>{step.icon}</Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </Box>
              <ArrowForward sx={{ color: 'text.secondary', fontSize: 20 }} />
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center">
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/courses')}
          endIcon={<ArrowForward />}
          sx={{ px: 4 }}
        >
          Get Started
        </Button>
        <Typography variant="body2" color="text.secondary">
          or
        </Typography>
        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate('/trading')}
          startIcon={<SwapHoriz />}
          sx={{ px: 4 }}
        >
          Jump to Trading
        </Button>
      </Stack>
    </Box>
  );
}
