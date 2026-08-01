import { ArrowForward, CalendarToday } from '@mui/icons-material';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Course, Section } from '../../types';
import { checkConflicts } from '../../utils/schedule';
import CalendarView from '../CalendarView';
import { EmptyState } from '../EmptyState';

interface ScheduleOverviewProps {
  sections: Section[];
  courses: Course[];
}

export function ScheduleOverview({ sections, courses }: ScheduleOverviewProps) {
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
      <Card sx={{ borderRadius: 4, bgcolor: 'background.paper' }}>
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
      </Card>
    </Stack>
  );
}
