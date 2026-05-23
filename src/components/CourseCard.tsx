import { ExpandLess, ExpandMore, PushPin, Schedule, Warning } from '@mui/icons-material';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControlLabel,
  IconButton,
  Radio,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { forwardRef, memo } from 'react';
import { useProfessorsMap } from '../hooks/useProfessorsMap';
import type { Course, Section } from '../types';
import { formatSlotDates, formatTimeSlots } from '../utils/schedule';
import { InstructorChip } from './InstructorChip';

interface CourseCardProps {
  course: Course;
  sections: Section[];
  selectedSectionId?: string;
  pinnedSectionId?: string;
  isExpanded: boolean;
  conflictIds: Set<string>;
  onExpand: () => void;
  onSelectSection: (sectionId: string) => void;
  onTogglePin?: (sectionId: string) => void;
}

/**
 * Memoized CourseCard component for optimized rendering
 * Prevents unnecessary re-renders when parent state changes
 */
export const CourseCard = memo(
  forwardRef<HTMLDivElement, CourseCardProps>(function CourseCard(
    {
      course,
      sections,
      selectedSectionId,
      pinnedSectionId,
      isExpanded,
      conflictIds,
      onExpand,
      onSelectSection,
      onTogglePin,
    },
    ref,
  ) {
    const theme = useTheme();
    const professorRatings = useProfessorsMap();

    return (
      <Card ref={ref} variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 1 }}>
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                }}
              >
                {course.code}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                }}
              >
                {course.name} • {course.credits} credits
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
              }}
            >
              {selectedSectionId && (
                <Chip
                  size="small"
                  label={`Section ${sections.find((s) => s.id === selectedSectionId)?.sectionNumber}`}
                  color="success"
                />
              )}
              <IconButton onClick={onExpand}>
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Stack>
          </Stack>
        </CardContent>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <CardContent sx={{ pt: 0, px: 2, pb: 2 }}>
            <Stack spacing={2} sx={{ width: '100%' }}>
              {sections.map((section) => {
                const isSelected = selectedSectionId === section.id;
                const conflict = conflictIds.has(section.id);
                const { dayDisplay, timeDisplay } = formatTimeSlots(section.timeSlots);

                return (
                  <Card
                    key={section.id}
                    variant="outlined"
                    onClick={() => onSelectSection(section.id)}
                    sx={{
                      cursor: 'pointer',
                      transition:
                        'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                      borderRadius: 3,
                      bgcolor: isSelected
                        ? alpha(theme.palette.success.main, 0.08)
                        : conflict
                          ? alpha(theme.palette.error.main, 0.08)
                          : alpha(theme.palette.action.hover, 0.15),
                      color: isSelected ? 'success.main' : conflict ? 'error.main' : 'inherit',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        bgcolor: isSelected
                          ? alpha(theme.palette.success.main, 0.12)
                          : alpha(theme.palette.action.hover, 0.5),
                      },
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack
                        direction="row"
                        sx={{
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 0.5,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <FormControlLabel
                            value={section.id}
                            onClick={(e) => e.stopPropagation()}
                            control={
                              <Radio
                                checked={isSelected}
                                onChange={() => onSelectSection(section.id)}
                                color="success"
                                sx={{ ml: -1.5, mr: 1 }}
                              />
                            }
                            label={
                              <Stack spacing={1}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: 600,
                                  }}
                                >
                                  Section {section.sectionNumber}
                                </Typography>
                                <Stack direction="row" spacing={2}>
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    sx={{
                                      alignItems: 'center',
                                    }}
                                  >
                                    <InstructorChip
                                      instructor={section.instructor}
                                      professorRatings={professorRatings}
                                    />
                                  </Stack>
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    sx={{
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Schedule sx={{ fontSize: 16 }} />
                                    <Typography variant="caption">
                                      {dayDisplay && timeDisplay ? (
                                        <>
                                          {dayDisplay}
                                          <Box component="span" sx={{ mx: 0.5 }}>
                                            •
                                          </Box>
                                          {timeDisplay}
                                          {section.timeSlots[0]?.startDate &&
                                            section.timeSlots[0]?.endDate && (
                                              <>
                                                <Box component="span" sx={{ mx: 0.5 }}>
                                                  •
                                                </Box>
                                                {formatSlotDates(section.timeSlots[0])}
                                              </>
                                            )}
                                        </>
                                      ) : (
                                        'No schedule'
                                      )}
                                    </Typography>
                                  </Stack>
                                </Stack>
                              </Stack>
                            }
                            sx={{
                              ml: -1,
                              flex: 1,
                              '& .MuiFormControlLabel-label': { width: '100%' },
                            }}
                          />
                        </Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{
                            alignItems: 'center',
                          }}
                        >
                          {isSelected && (
                            <>
                              {onTogglePin && (
                                <Tooltip
                                  title={
                                    pinnedSectionId === section.id
                                      ? 'Unpin section — allow alternatives'
                                      : 'Pin section — only use this section'
                                  }
                                >
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onTogglePin(section.id);
                                    }}
                                    sx={{ borderRadius: 2 }}
                                  >
                                    <PushPin
                                      fontSize="small"
                                      color={
                                        pinnedSectionId === section.id ? 'primary' : 'disabled'
                                      }
                                      sx={{
                                        transform:
                                          pinnedSectionId === section.id
                                            ? 'rotate(0deg)'
                                            : 'rotate(45deg)',
                                        transition: 'transform 0.2s',
                                      }}
                                    />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Chip size="small" label="Selected" color="success" />
                            </>
                          )}
                          {conflict && !isSelected && (
                            <Chip
                              size="small"
                              icon={<Warning />}
                              label="Conflict"
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </CardContent>
        </Collapse>
      </Card>
    );
  }),
);
