import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowForward, CalendarToday } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../EmptyState';
import { InfoCard } from '../AppBar';
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
  const conflicts = checkConflicts(sections);

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={<CalendarToday sx={{ fontSize: 40 }} />}
        title="Your schedule is empty"
        description="Select courses from the course browser to build your personalized timetable"
        action={
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => navigate('/courses')}
            endIcon={<ArrowForward />}
            sx={{ borderRadius: 3, px: 3, py: 1.5, fontWeight: 600 }}
          >
            Browse Courses
          </Button>
        }
        variant="fullscreen"
      />
    );
  }

  return (
    <Stack spacing={3}>
      <InfoCard>
        <Box sx={{ p: 3 }}>
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
              }}
            >
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
        </Box>
      </InfoCard>
      {aiAnalysis && (
        <InfoCard>
          <Box sx={{ p: 3 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{
                fontWeight: 800,
                color: 'secondary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              ✨ AI Optimization Report
            </Typography>
            <Box
              sx={{
                '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
                '& th, & td': {
                  border: '1px solid',
                  borderColor: 'divider',
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
          </Box>
        </InfoCard>
      )}
    </Stack>
  );
}
