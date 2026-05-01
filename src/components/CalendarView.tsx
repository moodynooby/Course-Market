import { ChevronLeft, ChevronRight, ViewDay, ViewWeek } from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { addWeeks, format, getDay, parse, startOfWeek, subWeeks } from 'date-fns';

import { enUS } from 'date-fns/locale/en-US';
import { memo, useCallback, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import type { CalendarEvent, Course, Section } from '../types';
import { sectionsToCalendarEvents } from '../utils/schedule';

import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  sections: Section[];
  courses: Course[];
  conflicts: string[];
}

interface EventProps {
  event: CalendarEvent;
}

const COURSE_COLORS = [
  '#c87a2a',
  '#0891b2',
  '#7c3aed',
  '#059669',
  '#dc2626',
  '#ea580c',
  '#4f46e5',
  '#be185d',
];

const EventComponent = memo(function EventComponent({ event }: EventProps) {
  const courseCode = event.resource?.course?.code || '';
  const sectionNumber = event.resource?.section?.sectionNumber || '';
  const colorIndex = courseCode.length > 0 ? courseCode.charCodeAt(0) % COURSE_COLORS.length : 0;
  const backgroundColor = COURSE_COLORS[colorIndex];

  return (
    <Box
      sx={{
        px: 0.75,
        py: 0.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor,
        color: '#fff',
        borderRadius: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        lineHeight: 1.2,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          lineHeight: 1.1,
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: '0.75rem',
        }}
      >
        {courseCode}
      </Typography>
      {sectionNumber && (
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            lineHeight: 1.1,
            opacity: 0.9,
            fontWeight: 500,
          }}
        >
          {sectionNumber}
        </Typography>
      )}
    </Box>
  );
});

export default function CalendarView({ sections, courses, conflicts }: CalendarViewProps) {
  const theme = useTheme();
  const [view, setView] = useState<string>(Views.WEEK);
  const [date, setDate] = useState(new Date());

  const events = useMemo(() => sectionsToCalendarEvents(sections, courses), [sections, courses]);

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: string) => {
    setView(newView);
  };

  const goToToday = () => {
    setDate(new Date());
  };

  const goToPrev = () => {
    setDate(view === Views.WEEK ? subWeeks(date, 1) : new Date(date.setDate(date.getDate() - 1)));
  };

  const goToNext = () => {
    setDate(view === Views.WEEK ? addWeeks(date, 1) : new Date(date.setDate(date.getDate() + 1)));
  };

  const eventStyleGetter = useCallback(
    (_event: CalendarEvent) => {
      const isConflicted = conflicts.some((c) =>
        c.includes(_event.resource?.section?.sectionNumber || ''),
      );

      const courseCode = _event.resource?.course?.code || '';
      const colorIndex =
        courseCode.length > 0 ? courseCode.charCodeAt(0) % COURSE_COLORS.length : 0;
      const baseColor = isConflicted ? theme.palette.error.main : COURSE_COLORS[colorIndex];

      // Add pattern overlay for conflicts
      const backgroundStyle = isConflicted
        ? `repeating-linear-gradient(45deg, ${baseColor}, ${baseColor} 10px, rgba(0,0,0,0.15) 10px, rgba(0,0,0,0.15) 20px)`
        : baseColor;

      return {
        style: {
          background: backgroundStyle,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '0.75rem',
          fontWeight: 600,
          opacity: isConflicted ? 0.9 : 1,
        },
      };
    },
    [conflicts, theme.palette.error.main],
  );

  const formats = useMemo(
    () => ({
      eventTimeRangeFormat: () => '',
      dayHeaderFormat: (date: Date) => format(date, 'EEEE'),
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`,
    }),
    [],
  );

  if (sections.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: theme.shape.borderRadius,
          bgcolor: 'background.paper',
        }}
      >
        <Typography
          sx={{
            color: 'text.secondary',
          }}
        >
          No courses scheduled
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mt: 1,
          }}
        >
          Select courses to see your schedule
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          bgcolor: 'background.default',
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
            }}
          >
            <IconButton onClick={goToPrev} size="small">
              <ChevronLeft />
            </IconButton>
            <Button variant="outlined" size="small" onClick={goToToday} sx={{ minWidth: 80 }}>
              Today
            </Button>
            <IconButton onClick={goToNext} size="small">
              <ChevronRight />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                ml: 2,
              }}
            >
              {format(date, view === Views.WEEK ? 'MMMM yyyy' : 'MMMM d, yyyy')}
            </Typography>
          </Stack>

          <ButtonGroup variant="outlined" size="small">
            <Button
              startIcon={<ViewWeek />}
              onClick={() => handleViewChange(Views.WEEK)}
              variant={view === Views.WEEK ? 'contained' : 'outlined'}
            >
              Week
            </Button>
            <Button
              startIcon={<ViewDay />}
              onClick={() => handleViewChange(Views.DAY)}
              variant={view === Views.DAY ? 'contained' : 'outlined'}
            >
              Day
            </Button>
          </ButtonGroup>
        </Box>

        <Box
          sx={{
            '& .rbc-calendar': {
              fontFamily: theme.typography.fontFamily,
            },
            '& .rbc-header': {
              py: 1.5,
              fontWeight: 600,
              fontSize: '0.8rem',
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor:
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            },
            '& .rbc-time-slot': {
              borderTop: `1px solid ${theme.palette.divider}`,
            },
            '& .rbc-timeslot-group': {
              minHeight: 48,
              borderColor:
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
            '& .rbc-time-content': {
              borderTop: `1px solid ${theme.palette.divider}`,
            },
            '& .rbc-time-header-content': {
              borderLeft: `1px solid ${theme.palette.divider}`,
            },
            '& .rbc-time-gutter': {
              bgcolor:
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            },
            '& .rbc-label': {
              fontSize: '0.7rem',
              color: theme.palette.text.secondary,
              fontWeight: 500,
            },
            '& .rbc-today': {
              bgcolor: alpha(theme.palette.secondary.main, 0.08),
            },
            '& .rbc-toolbar': {
              display: 'none',
            },
            '& .rbc-event': {
              padding: '2px 4px',
              border: 'none',
            },
            '& .rbc-current-time-indicator': {
              bgcolor: theme.palette.error.main,
              height: 2,
            },
            '& .rbc-current-time-indicator::before': {
              content: '""',
              position: 'absolute',
              left: -4,
              top: -4,
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: theme.palette.error.main,
            },
            '& .rbc-allday-cell': {
              display: 'none',
            },
            '& .rbc-time-header.rbc-overflowing': {
              borderRight: `1px solid ${theme.palette.divider}`,
            },
            '& .rbc-day-bg + .rbc-day-bg': {
              borderLeft: `1px solid ${theme.palette.divider}`,
            },
            '& .rbc-time-slot + .rbc-time-slot': {
              borderTop:
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255,255,255,0.05)'
                  : '1px solid rgba(0,0,0,0.05)',
            },
            '& .rbc-time-slot.rbc-now': {
              fontWeight: 600,
              color: theme.palette.secondary.main,
            },
            height: { xs: 400, sm: 500, md: 600, lg: 650 },
            minHeight: 400,
          }}
        >
          <Calendar
            localizer={localizer as unknown as object}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={handleViewChange}
            date={date}
            onNavigate={handleNavigate}
            views={[Views.WEEK, Views.DAY]}
            step={30}
            timeslots={2}
            min={new Date(1970, 1, 1, 8, 0, 0)}
            max={new Date(1970, 1, 1, 21, 0, 0)}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
            }}
            formats={formats}
            popup
            selectable={false}
            showMultiDayTimes={false}
          />
        </Box>
      </Paper>
      <Box sx={{ mt: 2.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: 'text.secondary',
            mb: 1.5,
            fontWeight: 600,
          }}
        >
          Enrolled Courses
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: 'wrap',
          }}
        >
          {sections.map((section) => {
            const course = courses.find((c) => c.id === section.courseId);
            const hasConflict = conflicts.some((c) => c.includes(section.sectionNumber));
            const colorIndex =
              (course?.code?.length || 0) > 0
                ? course!.code.charCodeAt(0) % COURSE_COLORS.length
                : 0;

            return (
              <Chip
                key={section.id}
                label={`${course?.code} - ${section.sectionNumber}`}
                size="small"
                sx={{
                  borderRadius: 2,
                  bgcolor: hasConflict
                    ? alpha(theme.palette.error.main, 0.1)
                    : `${COURSE_COLORS[colorIndex]}15`,
                  color: hasConflict ? 'error.main' : COURSE_COLORS[colorIndex],
                  borderColor: hasConflict ? 'error.main' : COURSE_COLORS[colorIndex],
                  fontWeight: 600,
                  px: 1.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: hasConflict
                      ? alpha(theme.palette.error.main, 0.2)
                      : `${COURSE_COLORS[colorIndex]}25`,
                    transform: 'translateY(-2px)',
                  },
                  '& .MuiChip-label': {
                    fontWeight: 600,
                  },
                }}
                variant="outlined"
              />
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
