import { Box, Button, Card, CardContent, Stack, Typography, alpha, useTheme } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../CalendarView';
import type { Course, Section } from '../../types';
import { checkConflicts } from '../../utils/schedule';

interface ScheduleOverviewProps {
  sections: Section[];
  courses: Course[];
  aiAnalysis?: string;
}

export function ScheduleOverview({ sections, courses, aiAnalysis }: ScheduleOverviewProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const conflicts = checkConflicts(sections);

  if (sections.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: 4,
          bgcolor: 'surface.containerHigh',
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              mx: 'auto',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.secondary.main, 0.3),
                filter: 'blur(8px)',
                position: 'absolute',
              }}
            />
          </Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Your schedule is empty
          </Typography>
          <Typography color="text.secondary" mb={3} maxWidth={400} mx="auto">
            Select courses from the course browser to build your personalized timetable
          </Typography>
          <Button
            variant="contained"
            color="accent"
            size="large"
            onClick={() => navigate('/courses')}
            endIcon={<ArrowForward />}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1.5,
              fontWeight: 600,
            }}
          >
            Browse Courses
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 4,
          bgcolor: 'surface.containerHigh',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              Schedule Overview
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/courses')}
              endIcon={<ArrowForward />}
              sx={{ borderRadius: 2 }}
            >
              Manage
            </Button>
          </Stack>
          <Box sx={{ height: 500 }}>
            <CalendarView sections={sections} courses={courses} conflicts={conflicts} />
          </Box>
        </CardContent>
      </Card>

      {aiAnalysis && (
        <Card
          sx={{
            borderRadius: 4,
            bgcolor: 'surface.containerHighest',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              fontWeight={800}
              color="accent.main"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              ✨ AI Optimization Report
            </Typography>
            <Box
              sx={{
                '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
                '& th, & td': {
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.15), // Ghost border per DESIGN.md
                  px: 1,
                  py: 0.5,
                  textAlign: 'left',
                },
                '& th': { bgcolor: 'action.hover', fontWeight: 600 },
                '& ul, & ol': { pl: 2, mb: 1 },
                '& li': { mb: 0.5 },
                '& p': { mb: 1, fontSize: '0.875rem' },
                '& strong': { fontWeight: 600 },
              }}
            >
              {aiAnalysis}
            </Box>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
