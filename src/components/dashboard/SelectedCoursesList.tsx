import { ArrowForward, Close, PushPin } from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Snackbar,
  SnackbarContent,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course, Section } from '../../types';

interface SelectedCoursesListProps {
  sections: Section[];
  courses: Course[];
  pinnedSectionIds?: Set<string>;
  onDeselect?: (courseId: string) => void;
  onUndoDeselect?: (courseId: string, sectionId: string) => void;
}

export function SelectedCoursesList({
  sections,
  courses,
  pinnedSectionIds,
  onDeselect,
  onUndoDeselect,
}: SelectedCoursesListProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [removed, setRemoved] = useState<{
    courseId: string;
    sectionId: string;
    courseCode: string;
  } | null>(null);

  const handleRemove = (courseId: string, sectionId: string, courseCode: string) => {
    onDeselect?.(courseId);
    setRemoved({ courseId, sectionId, courseCode });
  };

  const handleUndo = () => {
    if (removed && onUndoDeselect) {
      onUndoDeselect(removed.courseId, removed.sectionId);
    }
    setRemoved(null);
  };

  if (sections.length === 0) {
    return (
      <Card sx={{ borderRadius: 4, bgcolor: 'background.paper', p: 3 }} variant="outlined">
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Selected Courses
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No courses selected yet
        </Typography>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
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
                pr: onDeselect ? 1 : 2,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.secondary.main, 0.08),
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                },
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {course?.code}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {course?.name}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: 'secondary.main', display: 'inline-block' }}
                  >
                    Section {section.sectionNumber}
                  </Typography>
                  {pinnedSectionIds?.has(section.id) && (
                    <Chip
                      icon={<PushPin sx={{ fontSize: 12 }} />}
                      label="Pinned"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 20, '& .MuiChip-label': { fontSize: 10, px: 0.5 } }}
                    />
                  )}
                </Stack>
              </Box>
              {onDeselect && (
                <IconButton
                  size="small"
                  aria-label={`Remove ${course?.code || 'course'}`}
                  onClick={() =>
                    handleRemove(section.courseId, section.id, course?.code || section.courseId)
                  }
                  sx={{ flexShrink: 0 }}
                >
                  <Close sx={{ fontSize: 18 }} />
                </IconButton>
              )}
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
      <Snackbar
        open={!!removed}
        autoHideDuration={5000}
        onClose={() => setRemoved(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <SnackbarContent
          message={removed ? `Removed ${removed.courseCode}` : ''}
          action={
            onUndoDeselect ? (
              <Button color="secondary" size="small" onClick={handleUndo}>
                Undo
              </Button>
            ) : undefined
          }
        />
      </Snackbar>
    </Card>
  );
}
