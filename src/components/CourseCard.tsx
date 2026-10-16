import { ExpandLess, ExpandMore, PushPin, Schedule, Warning } from '@mui/icons-material';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Radio,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { forwardRef, memo, useMemo } from 'react';
import type { ProfessorRatingInfo } from '../hooks/useProfessorsMap';
import type { Course, Section } from '../types';
import { splitInstructorNames } from '../utils/instructor-name';
import { formatSlotDates, formatTimeSlots } from '../utils/schedule';
import { InstructorChip } from './InstructorChip';

interface CourseCardProps {
  course: Course;
  sections: Section[];
  selectedSectionId?: string;
  pinnedSectionId?: string;
  isExpanded: boolean;
  conflictIds: Set<string>;
  conflictDetails?: Map<string, string>;
  onExpand: () => void;
  onSelectSection: (sectionId: string) => void;
  onTogglePin?: (sectionId: string) => void;
  /**
   * Optimization: Passed from parent to avoid O(N) hook initializations
   * in virtualized lists.
   */
  professorRatings?: Map<string, ProfessorRatingInfo>;
}

/**
 * Memoized CourseCard component for optimized rendering.
 *
 * Optimization: Now receives professorRatings as a prop from the parent
 * (CoursesPage) to avoid each card instance calling useProfessorsMap(),
 * which significantly reduces hook initialization overhead and re-renders
 * when scrolling through large course lists.
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
      conflictDetails,
      onExpand,
      onSelectSection,
      onTogglePin,
      professorRatings,
    },
    ref,
  ) {
    const theme = useTheme();

    const selectedSection = useMemo(
      () => sections.find((s) => s.id === selectedSectionId),
      [sections, selectedSectionId],
    );

    const instructors = useMemo(() => {
      const set = new Set<string>();
      for (const section of sections) {
        if (section.instructor) {
          for (const name of splitInstructorNames(section.instructor)) {
            set.add(name);
          }
        }
      }
      return Array.from(set);
    }, [sections]);

    const seatStats = useMemo(() => {
      let totalCap = 0;
      let totalEnrolled = 0;
      let hasData = false;
      for (const section of sections) {
        if (section.capacity > 0) {
          hasData = true;
          totalCap += section.capacity;
          totalEnrolled += section.enrolled;
        }
      }
      return {
        hasData,
        openSeats: Math.max(0, totalCap - totalEnrolled),
        totalCap,
        totalEnrolled,
      };
    }, [sections]);

    return (
      <Card
        ref={ref}
        variant="outlined"
        sx={{
          mb: 2,
          borderRadius: 3,
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          borderColor: selectedSection ? alpha(theme.palette.success.main, 0.4) : 'divider',
          '&:hover': {
            borderColor: selectedSection
              ? theme.palette.success.main
              : alpha(theme.palette.primary.main, 0.3),
          },
        }}
      >
        <Box
          onClick={onExpand}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onExpand();
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${course.code} ${course.name}`}
          sx={{
            cursor: 'pointer',
            p: 2,
            pb: isExpanded ? 1.5 : 2,
            transition: 'background-color 0.15s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.action.hover, 0.4),
            },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: -2,
            },
          }}
        >
          <Stack spacing={1}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: 'text.primary',
                  }}
                >
                  {course.code}
                </Typography>
                <Chip
                  size="small"
                  label={course.subject}
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    borderRadius: 1,
                  }}
                />
                <Chip
                  size="small"
                  label={`${course.credits} cr`}
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    color: 'secondary.main',
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {selectedSection && (
                  <Chip
                    size="small"
                    label={`Sec ${selectedSection.sectionNumber} Selected`}
                    color="success"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpand();
                    }}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    tabIndex={-1}
                  >
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: 'text.secondary',
              }}
            >
              {course.name}
            </Typography>

            {!isExpanded && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 0.5, sm: 2 }}
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                }}
              >
                {instructors.length > 0 && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Taught by: {instructors.slice(0, 3).join(', ')}
                    {instructors.length > 3 ? '…' : ''}
                  </Typography>
                )}
                {seatStats.hasData && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: seatStats.openSeats === 0 ? 'error.main' : 'text.secondary',
                      fontWeight: seatStats.openSeats === 0 ? 600 : 400,
                    }}
                  >
                    {seatStats.openSeats === 0
                      ? 'All sections full'
                      : `${seatStats.openSeats} spots open across sections`}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </Box>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <CardContent sx={{ pt: 0, px: 2, pb: 2 }}>
            {course.description && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.action.hover, 0.25),
                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                  {course.description}
                </Typography>
              </Box>
            )}
            <Stack spacing={1.5} sx={{ width: '100%' }}>
              {sections.map((section) => {
                const isSelected = selectedSectionId === section.id;
                const conflict = conflictIds.has(section.id);
                const conflictMessage = conflictDetails?.get(section.id);
                const { timeDisplay } = formatTimeSlots(section.timeSlots);
                const uniqueDays = Array.from(new Set(section.timeSlots.map((s) => s.day)));
                const seatsLeft = Math.max(0, section.capacity - section.enrolled);
                const isFull = section.capacity > 0 && seatsLeft === 0;
                const isNearFull = section.capacity > 0 && seatsLeft > 0 && seatsLeft <= 5;

                return (
                  <Card
                    key={section.id}
                    variant="outlined"
                    onClick={() => onSelectSection(section.id)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectSection(section.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Select section ${section.sectionNumber}`}
                    sx={{
                      cursor: 'pointer',
                      transition:
                        'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                      borderRadius: 2.5,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected
                        ? 'success.main'
                        : conflict
                          ? alpha(theme.palette.error.main, 0.5)
                          : 'divider',
                      bgcolor: isSelected
                        ? alpha(theme.palette.success.main, 0.08)
                        : conflict
                          ? alpha(theme.palette.error.main, 0.04)
                          : alpha(theme.palette.action.hover, 0.15),
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        bgcolor: isSelected
                          ? alpha(theme.palette.success.main, 0.12)
                          : alpha(theme.palette.action.hover, 0.4),
                      },
                    }}
                  >
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        sx={{
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{ alignItems: 'flex-start', flex: 1, minWidth: 0 }}
                        >
                          <Radio
                            checked={isSelected}
                            onChange={() => onSelectSection(section.id)}
                            onClick={(e) => e.stopPropagation()}
                            color="success"
                            size="small"
                            sx={{ mt: -0.25, p: 0.5 }}
                            slotProps={{
                              input: { 'aria-label': `Select section ${section.sectionNumber}` },
                            }}
                          />
                          <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 700,
                                  color: isSelected ? 'success.main' : 'text.primary',
                                }}
                              >
                                Section {section.sectionNumber}
                              </Typography>
                              {section.capacity > 0 && (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={
                                    isFull
                                      ? 'Full (0 seats)'
                                      : `${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left (${section.enrolled}/${section.capacity})`
                                  }
                                  color={isFull ? 'error' : isNearFull ? 'warning' : 'default'}
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: isFull || isNearFull ? 600 : 400,
                                    borderRadius: 1,
                                  }}
                                />
                              )}
                            </Stack>

                            <Stack
                              direction="row"
                              spacing={2}
                              sx={{
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 1,
                              }}
                            >
                              <InstructorChip
                                instructor={section.instructor}
                                professorRatings={professorRatings}
                              />
                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <Schedule sx={{ fontSize: 15, color: 'text.secondary' }} />
                                {uniqueDays.length > 0 ? (
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    sx={{ alignItems: 'center' }}
                                  >
                                    {uniqueDays.map((day) => (
                                      <Box
                                        key={day}
                                        component="span"
                                        sx={{
                                          px: 0.5,
                                          py: 0.1,
                                          borderRadius: 0.75,
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                                          color: 'primary.main',
                                        }}
                                      >
                                        {day}
                                      </Box>
                                    ))}
                                    <Typography
                                      variant="caption"
                                      sx={{ color: 'text.secondary', ml: 0.5 }}
                                    >
                                      {timeDisplay}
                                      {section.timeSlots[0]?.startDate &&
                                        section.timeSlots[0]?.endDate && (
                                          <> • {formatSlotDates(section.timeSlots[0])}</>
                                        )}
                                    </Typography>
                                  </Stack>
                                ) : (
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    No schedule (TBA)
                                  </Typography>
                                )}
                              </Stack>
                            </Stack>
                          </Stack>
                        </Stack>

                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{
                            alignItems: 'center',
                            alignSelf: { xs: 'flex-end', sm: 'center' },
                          }}
                        >
                          {isSelected && (
                            <>
                              {onTogglePin && (
                                <Tooltip
                                  title={
                                    pinnedSectionId === section.id
                                      ? 'Unpin section - allow alternatives in generator'
                                      : 'Pin section - lock this specific section'
                                  }
                                >
                                  <IconButton
                                    size="small"
                                    aria-label={
                                      pinnedSectionId === section.id
                                        ? 'Unpin section'
                                        : 'Pin section'
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onTogglePin(section.id);
                                    }}
                                    sx={{ borderRadius: 1.5 }}
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
                              <Chip
                                size="small"
                                label="Selected"
                                color="success"
                                sx={{ fontWeight: 600 }}
                              />
                            </>
                          )}
                          {conflict && !isSelected && (
                            <Tooltip
                              title={
                                conflictMessage
                                  ? `Time conflict with ${conflictMessage}`
                                  : 'Conflicts with a selected course'
                              }
                              arrow
                            >
                              <Chip
                                size="small"
                                icon={<Warning />}
                                label={
                                  conflictMessage ? `Conflict: ${conflictMessage}` : 'Conflict'
                                }
                                color="error"
                                variant="outlined"
                                sx={{
                                  maxWidth: { xs: 200, sm: 260 },
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  },
                                }}
                              />
                            </Tooltip>
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
