import { Box, Button, Card, Stack, Typography, alpha, useTheme } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Course, Section } from '../../types';

interface SelectedCoursesListProps {
  sections: Section[];
  courses: Course[];
}

export function SelectedCoursesList({ sections, courses }: SelectedCoursesListProps) {
  const navigate = useNavigate();
  const theme = useTheme();

  if (sections.length === 0) {
    return (
      <Card sx={{ borderRadius: 4, bgcolor: 'background.paper', p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mb: 2,
          }}
        >
          Selected Courses
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
          }}
        >
          No courses selected yet
        </Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ borderRadius: 4, bgcolor: 'background.paper', p: 3 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 2,
        }}
      >
        Selected Courses ({sections.length})
      </Typography>
      <Stack spacing={2}>
        {sections.map((section) => {
          const course = courses.find((c) => c.id === section.courseId);
          return (
            <Box
              key={section.id}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.secondary.main, 0.08),
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                }}
              >
                {course?.code}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                }}
              >
                {course?.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: 'secondary.main',
                  mt: 0.5,
                  display: 'inline-block',
                }}
              >
                Section {section.sectionNumber}
              </Typography>
            </Box>
          );
        })}
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate('/courses')}
          endIcon={<ArrowForward />}
          sx={{ borderRadius: 2, mt: 1 }}
        >
          Manage Courses
        </Button>
      </Stack>
    </Card>
  );
}
