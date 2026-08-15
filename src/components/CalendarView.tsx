import { Close, Download, EventNote, Google, Person, School } from '@mui/icons-material';
import {
  Alert,
  AppBar,
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { addWeeks, format, getDay, parse, startOfWeek, subWeeks } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import html2canvas from 'html2canvas';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { View } from 'react-big-calendar';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { buildDeepLink } from '../native/deepLinks';
import { hapticLight, hapticSuccess } from '../native/haptics';
import { shareContent } from '../native/share';
import type { CalendarEvent, Course, Section } from '../types';
import { buildGoogleCalendarUrlForSlot, openGoogleCalendarUrl } from '../utils/googleCalendar';
import { icsToBlob, sectionsToIcs, timeToMinutes } from '../utils/icsExport';
import { isSlotActiveDuring, sectionsToCalendarEvents } from '../utils/schedule';

import CalendarToolbar from './CalendarToolbar';

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
  similarSectionCounts?: Map<string, number>;
}

interface EventProps {
  event: CalendarEvent;
  onSelect?: (event: CalendarEvent) => void;
  touchFriendly?: boolean;
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

const EventComponent = memo(function EventComponent({
  event,
  onSelect,
  touchFriendly,
}: EventProps) {
  const courseCode = event.resource?.course?.code || '';
  const courseName = event.resource?.course?.name || '';
  const sectionNumber = event.resource?.section?.sectionNumber || '';
  const similarPeers = event.resource?.similarPeers ?? 0;
  const colorIndex = courseCode.length > 0 ? courseCode.charCodeAt(0) % COURSE_COLORS.length : 0;
  const backgroundColor = COURSE_COLORS[colorIndex];
  const timeStr = `${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`;

  const content = (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
        {courseCode}
        {sectionNumber ? ` - ${sectionNumber}` : ''}
      </Typography>
      {courseName && (
        <Typography variant="body2" sx={{ fontSize: '0.75rem', opacity: 0.9, mt: 0.25 }}>
          {courseName}
        </Typography>
      )}
      <Typography variant="body2" sx={{ fontSize: '0.75rem', opacity: 0.8, mt: 0.25 }}>
        {timeStr}
      </Typography>
      {similarPeers > 0 && (
        <Typography
          variant="body2"
          sx={{ fontSize: '0.7rem', opacity: 0.75, mt: 0.5, fontStyle: 'italic' }}
        >
          {similarPeers} similar section{similarPeers === 1 ? '' : 's'} available
        </Typography>
      )}
    </Box>
  );

  // On touch devices hover tooltips never fire, so a tap opens the detail
  // sheet instead. On desktop the tooltip remains for instant previews.
  if (touchFriendly && onSelect) {
    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(event);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(event);
          }
        }}
        aria-label={`Open details for ${courseCode}${sectionNumber ? ` ${sectionNumber}` : ''}`}
        sx={{ height: '100%', cursor: 'pointer' }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Tooltip title={content} arrow enterDelay={200} enterNextDelay={200} leaveDelay={0}>
      <Box
        sx={{
          px: 0.5,
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
            fontSize: '0.7rem',
          }}
        >
          {courseCode}
        </Typography>
        {sectionNumber && (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              lineHeight: 1.1,
              opacity: 0.9,
              fontWeight: 500,
            }}
          >
            {sectionNumber}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
});

export default function CalendarView({
  sections,
  courses,
  conflicts,
  similarSectionCounts,
}: CalendarViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [view, setView] = useState<View>((isMobile ? Views.AGENDA : Views.WEEK) as View);
  const [date, setDate] = useState(new Date());
  const [fullscreen, setFullscreen] = useState(isMobile);
  const [capturing, setCapturing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [shareAlert, setShareAlert] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const autoNavigated = useRef(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Touch swipe navigation: horizontal swipes move between weeks/days.
  // Works in the native app (touch-first) and on touch laptops/tablets in
  // the browser; desktop users still use the chevron buttons.
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length !== 1) return;
    swipeStartX.current = event.touches[0].clientX;
    swipeStartY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const deltaX = event.changedTouches[0].clientX - swipeStartX.current;
    const deltaY = event.changedTouches[0].clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;

    // Require a mostly-horizontal swipe of at least 60px to avoid
    // conflicting with vertical scrolling.
    if (Math.abs(deltaY) > Math.abs(deltaX) || Math.abs(deltaX) < 60) return;

    if (deltaX > 0) {
      goToPrev();
    } else {
      goToNext();
    }
    void hapticLight();
  };

  useEffect(() => {
    if (autoNavigated.current || sections.length === 0) return;

    const now = new Date();
    let hasActiveSlot = false;
    let earliest: Date | null = null;

    outer: for (const section of sections) {
      for (const slot of section.timeSlots) {
        if (isSlotActiveDuring(slot, now)) {
          hasActiveSlot = true;
          break outer;
        }
        if (slot.startDate) {
          const d = new Date(slot.startDate);
          if (!earliest || d < earliest) earliest = d;
        }
      }
    }

    if (!hasActiveSlot && earliest) setDate(earliest);
    autoNavigated.current = true;
  }, [sections]);

  const events = useMemo(() => {
    const base = sectionsToCalendarEvents(sections, courses, date);
    if (!similarSectionCounts || similarSectionCounts.size === 0) return base;
    return base.map((ev) => {
      if (!ev.resource) return ev;
      const peers = similarSectionCounts.get(ev.resource.section.id) ?? 0;
      if (peers === 0) return ev;
      return { ...ev, resource: { ...ev.resource, similarPeers: peers } };
    });
  }, [sections, courses, date, similarSectionCounts]);

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const goToToday = () => {
    setDate(new Date());
  };

  const goToPrev = () => {
    if (view === Views.WEEK) {
      setDate(subWeeks(date, 1));
    } else {
      const next = new Date(date);
      next.setDate(next.getDate() - 1);
      setDate(next);
    }
  };

  const goToNext = () => {
    if (view === Views.WEEK) {
      setDate(addWeeks(date, 1));
    } else {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      setDate(next);
    }
  };

  const handleShare = useCallback(async () => {
    if (!calendarRef.current) return;

    setCapturing(true);
    try {
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: theme.palette.mode === 'dark' ? '#1a1a2e' : '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setShareAlert({
            open: true,
            message: 'Failed to generate image',
            severity: 'error',
          });
          setCapturing(false);
          return;
        }

        // Native app: the Capacitor Share plugin hands the image to the OS
        // share sheet (WhatsApp, Instagram DMs, ...). Web browsers fall back
        // through the Web Share API to a clipboard copy automatically.
        const ok = await shareContent({
          title: 'My Schedule',
          text: `Check out my course schedule! Build yours at ${buildDeepLink({})}`,
          url: buildDeepLink({}),
          imageDataUrl: canvas.toDataURL('image/png'),
        });

        if (ok) {
          void hapticSuccess();
          setShareAlert({
            open: true,
            message: 'Schedule shared successfully',
            severity: 'success',
          });
        } else {
          // Share cancelled or unsupported — still offer the download so
          // the captured image is never wasted.
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'schedule.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          void hapticLight();
          setShareAlert({
            open: true,
            message: 'Schedule downloaded as image',
            severity: 'success',
          });
        }
        setCapturing(false);
      }, 'image/png');
    } catch {
      setShareAlert({
        open: true,
        message: 'Failed to capture schedule',
        severity: 'error',
      });
      setCapturing(false);
    }
  }, [theme.palette.mode]);

  /**
   * Share or download the schedule as an iCalendar (.ics) file with one
   * recurring event per weekly class slot. In the Android app the native share
   * sheet opens directly into Google Calendar / other calendar apps; on the web
   * it falls back to a download.
   */
  const handleExportIcs = useCallback(async () => {
    const ics = sectionsToIcs(sections, courses, date);
    const blob = icsToBlob(ics);
    const file = new File([blob], 'my-schedule.ics', { type: 'text/calendar' });

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Schedule',
          text: 'My course schedule (.ics) — import into any calendar app',
        });
        setShareAlert({ open: true, message: 'Schedule exported', severity: 'success' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-schedule.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShareAlert({ open: true, message: 'Schedule downloaded (.ics)', severity: 'success' });
      }
    } catch (exportError) {
      if ((exportError as Error).name !== 'AbortError') {
        setShareAlert({ open: true, message: 'Failed to export schedule', severity: 'error' });
      }
    }
  }, [sections, courses, date]);

  /** Open Google Calendar for the whole schedule (recurring template URL). */
  const handleAddAllToGoogleCalendar = useCallback(() => {
    if (sections.length === 0) return;
    // Open one Google Calendar tab per weekly slot so each class becomes its
    // own recurring event in the user's calendar.
    sections.forEach((section, sectionIdx) => {
      section.timeSlots.forEach((slot, slotIdx) => {
        const course = courses.find((c) => c.id === section.courseId);
        const slotEvents = sectionsToCalendarEvents([section], courses).filter(
          (ev) =>
            ev.start.getDay() === { M: 1, T: 2, W: 3, Th: 4, F: 5, Sa: 6, Su: 0 }[slot.day] &&
            ev.start.getHours() * 60 + ev.start.getMinutes() === timeToMinutes(slot.startTime),
        );
        if (slotEvents.length === 0) return;
        slotEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
        const anchor = slotEvents[0].start;
        // Delay each tab slightly so browsers do not silently block all of them.
        window.setTimeout(
          () => {
            const url = buildGoogleCalendarUrlForSlot(section, slot, course, anchor);
            openGoogleCalendarUrl(url);
          },
          (sectionIdx * 10 + slotIdx) * 400,
        );
      });
    });
    setShareAlert({
      open: true,
      message: 'Opening Google Calendar for each class — accept each prompt to save',
      severity: 'success',
    });
  }, [sections, courses]);

  const handleEventSelect = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const eventStyleGetter = useCallback(
    (_event: CalendarEvent) => {
      const isConflicted = conflicts.some((c) =>
        c.includes(_event.resource?.section?.sectionNumber || ''),
      );

      const courseCode = _event.resource?.course?.code || '';
      const colorIndex =
        courseCode.length > 0 ? courseCode.charCodeAt(0) % COURSE_COLORS.length : 0;
      const baseColor = isConflicted ? theme.palette.error.main : COURSE_COLORS[colorIndex];

      const backgroundStyle = isConflicted
        ? `repeating-linear-gradient(45deg, ${baseColor}, ${baseColor} 10px, rgba(0,0,0,0.15) 10px, rgba(0,0,0,0.15) 20px)`
        : baseColor;

      return {
        style: {
          background: backgroundStyle,
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
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
      eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
      dayHeaderFormat: (date: Date) => format(date, 'EEEE'),
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`,
      agendaDateFormat: (date: Date) => format(date, isMobile ? 'EEE M/d' : 'EEEE, MMMM d'),
      agendaTimeFormat: (date: Date) => format(date, 'h:mm a'),
      agendaEventFormat: () => '',
    }),
    [isMobile],
  );

  const commonCalendarStyles = useMemo(
    () => ({
      '& .rbc-calendar': {
        fontFamily: theme.typography.fontFamily,
      },
      '& .rbc-header': {
        py: 1.5,
        fontWeight: 600,
        fontSize: '0.85rem',
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      },
      '& .rbc-time-slot': {
        borderTop: `1px solid ${theme.palette.divider}`,
      },
      '& .rbc-timeslot-group': {
        minHeight: 56,
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      },
      '& .rbc-time-content': {
        borderTop: `1px solid ${theme.palette.divider}`,
      },
      '& .rbc-time-header-content': {
        borderLeft: `1px solid ${theme.palette.divider}`,
      },
      '& .rbc-time-gutter': {
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      },
      '& .rbc-label': {
        fontSize: '0.75rem',
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
      '& .rbc-event-content': {
        color: 'inherit',
      },
      '& .rbc-current-time-indicator': {
        bgcolor: theme.palette.error.main,
        height: 2,
        boxShadow: `0 0 6px ${alpha(theme.palette.error.main, 0.5)}`,
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
        boxShadow: `0 0 8px ${alpha(theme.palette.error.main, 0.6)}`,
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
      // Agenda view: more breathable rows on mobile
      '& .rbc-agenda-table': {
        border: `1px solid ${theme.palette.divider}`,
      },
      '& .rbc-agenda-date-cell': {
        fontWeight: 600,
        fontSize: { xs: '0.8rem', sm: '0.85rem' },
      },
      '& .rbc-agenda-time-cell': {
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        px: 1,
      },
      '& .rbc-agenda-event-cell': {
        fontSize: { xs: '0.8rem', sm: '0.875rem' },
        fontWeight: 600,
      },
      '& .rbc-agenda-view .rbc-event': {
        borderRadius: 1,
        padding: '4px 8px',
      },
      '& .rbc-event.rbc-selected, & .rbc-event:focus': {
        opacity: 0.85,
      },
      // Touch: bigger tap targets for week columns
      [`@media (max-width: ${theme.breakpoints.values.sm - 1}px)`]: {
        '& .rbc-timeslot-group': {
          minHeight: 64,
        },
        '& .rbc-label': {
          fontSize: '0.8rem',
        },
        '& .rbc-header': {
          fontSize: '0.75rem',
        },
      },
    }),
    [theme],
  );

  const dialogStyles = useMemo(
    () => ({
      '& .MuiDialog-paper': {
        bgcolor: theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
      },
    }),
    [theme.palette.background.default],
  );

  const watermarkText = 'Make your own at https://aurais.netlify.app/';

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          bgcolor: 'background.default',
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <CalendarToolbar
          variant="inline"
          view={view}
          onViewChange={handleViewChange}
          date={date}
          onPrev={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
          onAddToGoogle={handleAddAllToGoogleCalendar}
          onExportIcs={handleExportIcs}
          onShare={handleShare}
          capturing={capturing}
          isMobile={isMobile}
          fullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen((prev) => !prev)}
        />

        <Box
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          sx={{
            ...commonCalendarStyles,
            flex: 1,
            minHeight: 320,
            overflow: 'hidden',
            '& .rbc-agenda-view': {
              overflow: 'auto',
            },
          }}
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={handleViewChange}
            date={date}
            onNavigate={handleNavigate}
            views={[Views.WEEK, Views.DAY, Views.AGENDA]}
            step={30}
            timeslots={2}
            min={new Date(1970, 0, 1, 8, 0, 0)}
            max={new Date(1970, 0, 1, 21, 0, 0)}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleEventSelect}
            components={{
              event: (props) => (
                <EventComponent
                  event={props.event}
                  onSelect={handleEventSelect}
                  touchFriendly={isMobile}
                />
              ),
            }}
            formats={formats}
            popup
            selectable={false}
            showMultiDayTimes={false}
          />
        </Box>
      </Paper>
      {conflicts.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Typography
            variant="subtitle2"
            sx={{ color: 'text.secondary', mb: 1.5, fontWeight: 600 }}
          >
            Conflicts Detected
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {sections
              .filter((section) => conflicts.some((c) => c.includes(section.sectionNumber)))
              .map((section) => {
                const course = courses.find((c) => c.id === section.courseId);
                return (
                  <Chip
                    key={section.id}
                    label={`${course?.code} - ${section.sectionNumber}`}
                    size="small"
                    sx={{
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      color: 'error.main',
                      borderColor: 'error.main',
                      fontWeight: 600,
                      px: 1.5,
                    }}
                    variant="outlined"
                  />
                );
              })}
          </Stack>
        </Box>
      )}
      <Dialog fullScreen open={fullscreen} onClose={() => setFullscreen(false)} sx={dialogStyles}>
        <AppBar
          position="sticky"
          sx={{
            bgcolor: 'background.paper',
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <CalendarToolbar
            variant="fullscreen"
            view={view}
            onViewChange={handleViewChange}
            date={date}
            onPrev={goToPrev}
            onNext={goToNext}
            onToday={goToToday}
            onAddToGoogle={handleAddAllToGoogleCalendar}
            onExportIcs={handleExportIcs}
            onShare={handleShare}
            capturing={capturing}
            isMobile={isMobile}
            onClose={() => setFullscreen(false)}
          />
        </AppBar>
        <DialogContent
          sx={{
            p: 3,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <Box
            ref={calendarRef}
            sx={{
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              bgcolor: theme.palette.background.default,
              ...commonCalendarStyles,
            }}
          >
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={handleViewChange}
              date={date}
              onNavigate={handleNavigate}
              views={[Views.WEEK, Views.DAY, Views.AGENDA]}
              step={30}
              timeslots={2}
              min={new Date(1970, 0, 1, 8, 0, 0)}
              max={new Date(1970, 0, 1, 21, 0, 0)}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleEventSelect}
              components={{
                event: (props) => (
                  <EventComponent
                    event={props.event}
                    onSelect={handleEventSelect}
                    touchFriendly={isMobile}
                  />
                ),
              }}
              formats={formats}
              popup
              selectable={false}
              showMultiDayTimes={false}
            />
            <Typography
              sx={{
                position: 'absolute',
                bottom: { xs: 60, md: 80 },
                right: { xs: 20, md: 40 },
                fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.85rem' },
                fontWeight: 600,
                color: '#ffffff',
                mixBlendMode: 'difference',
                opacity: 0.5,
                transform: 'rotate(-10deg)',
                transformOrigin: 'bottom right',
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
                zIndex: 1000,
              }}
            >
              {watermarkText}
            </Typography>
            <Typography
              sx={{
                position: 'absolute',
                top: { xs: 100, md: 140 },
                left: { xs: 16, md: 32 },
                fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.8rem' },
                fontWeight: 600,
                color: '#ffffff',
                mixBlendMode: 'difference',
                opacity: 0.4,
                transform: 'rotate(-20deg)',
                transformOrigin: 'top left',
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
                zIndex: 1000,
              }}
            >
              {watermarkText}
            </Typography>
            <Typography
              sx={{
                position: 'absolute',
                top: '45%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-20deg)',
                fontSize: { xs: '0.7rem', sm: '0.85rem', md: '1rem' },
                fontWeight: 700,
                color: '#ffffff',
                mixBlendMode: 'difference',
                opacity: 0.3,
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                letterSpacing: '1px',
                zIndex: 1000,
              }}
            >
              {watermarkText}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Event detail dialog: tap a class to see full info and export options.
          Renders as a bottom sheet on mobile for thumb-friendly access. */}
      <Dialog
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        fullScreen={isMobile}
        sx={dialogStyles}
      >
        {selectedEvent &&
          (() => {
            const section = selectedEvent.resource?.section;
            const course = selectedEvent.resource?.course;
            if (!section || !course) return null;
            const slot = section.timeSlots[0];
            const remaining = section.capacity - section.enrolled;
            const gcalUrl = section.timeSlots.length
              ? buildGoogleCalendarUrlForSlot(
                  section,
                  section.timeSlots[0],
                  course,
                  selectedEvent.start,
                )
              : null;
            return (
              <>
                {isMobile && (
                  <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
                    <Toolbar>
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        Class Details
                      </Typography>
                      <IconButton
                        edge="end"
                        onClick={() => setSelectedEvent(null)}
                        aria-label="close"
                      >
                        <Close />
                      </IconButton>
                    </Toolbar>
                  </AppBar>
                )}
                <Box sx={{ p: { xs: 3, sm: 4 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {course.code} - {section.sectionNumber}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {course.name}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
                      <EventNote color="primary" fontSize="small" />
                      <Typography variant="body1">
                        {section.timeSlots
                          .map((s) => `${s.day} ${s.startTime} - ${s.endTime}`)
                          .join(', ')}
                      </Typography>
                    </Stack>
                    {section.instructor && (
                      <Stack direction="row" spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
                        <Person color="primary" fontSize="small" />
                        <Typography variant="body1">{section.instructor}</Typography>
                      </Stack>
                    )}
                    <Stack direction="row" spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
                      <School color="primary" fontSize="small" />
                      <Typography variant="body1">
                        {section.enrolled}/{section.capacity} enrolled
                        {Number.isFinite(remaining)
                          ? ` (${remaining} seat${remaining === 1 ? '' : 's'} left)`
                          : ''}
                      </Typography>
                    </Stack>
                    {slot?.startDate &&
                      (() => {
                        const s = new Date(slot.startDate);
                        return !Number.isNaN(s.getTime());
                      })() && (
                        <Typography variant="body2" color="text.secondary">
                          Meets weekly from {format(new Date(slot.startDate!), 'MMMM d, yyyy')}
                          {slot.endDate
                            ? ` to ${format(new Date(slot.endDate), 'MMMM d, yyyy')}`
                            : ''}
                        </Typography>
                      )}
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: 4, flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<Google />}
                      onClick={() => {
                        if (gcalUrl) openGoogleCalendarUrl(gcalUrl);
                        setSelectedEvent(null);
                      }}
                      color="secondary"
                    >
                      Add to Google Calendar
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => {
                        handleExportIcs();
                        setSelectedEvent(null);
                      }}
                    >
                      Export .ics
                    </Button>
                    {!isMobile && (
                      <IconButton onClick={() => setSelectedEvent(null)} aria-label="close">
                        <Close />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              </>
            );
          })()}
      </Dialog>
      <Snackbar
        open={shareAlert.open}
        autoHideDuration={4000}
        onClose={() => setShareAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={shareAlert.severity}
          onClose={() => setShareAlert((prev) => ({ ...prev, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {shareAlert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
