import { ExpandLess, ExpandMore, Person, Schedule, Warning } from '@mui/icons-material';
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
  Tooltip,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { forwardRef, memo, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { Course, Section } from '../types';
import { formatTimeSlots } from '../utils/schedule';

interface CourseCardProps {
  course: Course;
  sections: Section[];
  selectedSectionId?: string;
  isExpanded: boolean;
  hasConflict: (section: Section) => boolean;
  onExpand: () => void;
  onSelectSection: (sectionId: string) => void;
}

/**
 * Memoized CourseCard component for optimized rendering
 * Prevents unnecessary re-renders when parent state changes
 */
export const CourseCard = memo(
  forwardRef<HTMLDivElement, CourseCardProps>(function CourseCard(
    { course, sections, selectedSectionId, isExpanded, hasConflict, onExpand, onSelectSection },
    ref,
  ) {
    const theme = useTheme();

    const handleCardClick = useCallback(
      (sectionId: string) => {
        onSelectSection(sectionId);
      },
      [onSelectSection],
    );

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
              <Tooltip title={isExpanded ? 'Hide sections' : 'Show sections'}>
                <IconButton
                  onClick={onExpand}
                  aria-label={isExpanded ? 'Hide sections' : 'Show sections'}
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </CardContent>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <CardContent sx={{ pt: 0, px: 2, pb: 2 }}>
            <Stack spacing={2} sx={{ width: '100%' }}>
              {sections.map((section) => {
                const isSelected = selectedSectionId === section.id;
                const conflict = hasConflict(section);
                const { dayDisplay, timeDisplay } = formatTimeSlots(section.timeSlots);

                return (
                  <Card
                    key={section.id}
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      transition:
                        'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                      borderRadius: 3,
                      border: 'none',
                      bgcolor: isSelected
                        ? alpha(theme.palette.success.main, 0.08)
                        : conflict
                          ? alpha(theme.palette.error.main, 0.08)
                          : 'background.paperest',
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
                            control={
                              <Radio
                                checked={isSelected}
                                onChange={() => handleCardClick(section.id)}
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
                                    <Person sx={{ fontSize: 16 }} />
                                    <Typography variant="caption">
                                      {section.instructor.split(',').map((name, index, array) => {
                                        const trimmedName = name.trim();
                                        if (
                                          !trimmedName ||
                                          trimmedName === 'Not added' ||
                                          trimmedName === 'To Be Announced' ||
                                          trimmedName === 'TBA'
                                        ) {
                                          return trimmedName;
                                        }
                                        return (
                                          <Fragment key={trimmedName}>
                                            <Typography
                                              component={Link}
                                              to={`/professors?search=${encodeURIComponent(trimmedName)}`}
                                              variant="caption"
                                              onClick={(e) => e.stopPropagation()}
                                              sx={{
                                                color: 'primary.main',
                                                textDecoration: 'none',
                                                '&:hover': { textDecoration: 'underline' },
                                              }}
                                            >
                                              {trimmedName}
                                            </Typography>
                                            {index < array.length - 1 && ', '}
                                          </Fragment>
                                        );
                                      })}
                                    </Typography>
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
                                          {dayDisplay}{' '}
                                          <Box component="span" sx={{ mx: 0.5 }}>
                                            •
                                          </Box>{' '}
                                          {timeDisplay}
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
                          {isSelected && <Chip size="small" label="Selected" color="success" />}
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
