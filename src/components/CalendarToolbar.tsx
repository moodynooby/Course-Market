import {
  ChevronLeft,
  ChevronRight,
  Close,
  Download,
  Fullscreen,
  FullscreenExit,
  Google,
  ListAlt,
  MoreVert,
  Share,
  ViewDay,
  ViewWeek,
} from '@mui/icons-material';
import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { format } from 'date-fns';
import type { ReactElement } from 'react';
import { useState } from 'react';
import type { View } from 'react-big-calendar';
import { Views } from 'react-big-calendar';

interface CalendarToolbarProps {
  /** Inline renders below a border with the fullscreen toggle; fullscreen adds the title chip and close button. */
  variant?: 'inline' | 'fullscreen';
  view: View;
  onViewChange: (view: View) => void;
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddToGoogle: () => void;
  onExportIcs: () => void;
  onShare: () => void;
  capturing: boolean;
  isMobile: boolean;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
}

/** Spinner shown in place of the share icon while the schedule image is captured. */
function CapturingSpinner() {
  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'calendar-toolbar-spin 0.8s linear infinite',
        '@keyframes calendar-toolbar-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    />
  );
}

const VIEW_OPTIONS: { value: View; label: string; icon: ReactElement }[] = [
  { value: Views.WEEK, label: 'Week', icon: <ViewWeek sx={{ fontSize: 18 }} /> },
  { value: Views.DAY, label: 'Day', icon: <ViewDay sx={{ fontSize: 18 }} /> },
  { value: Views.AGENDA, label: 'List', icon: <ListAlt sx={{ fontSize: 18 }} /> },
];

/**
 * Compact, responsive toolbar shared by the inline calendar header and the
 * fullscreen AppBar. Wraps into two tidy rows on narrow screens instead of
 * overflowing; long export actions live in a kebab menu.
 */
export default function CalendarToolbar({
  variant = 'inline',
  view,
  onViewChange,
  date,
  onPrev,
  onNext,
  onToday,
  onAddToGoogle,
  onExportIcs,
  onShare,
  capturing,
  isMobile,
  fullscreen,
  onToggleFullscreen,
  onClose,
}: CalendarToolbarProps) {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const title =
    view === Views.WEEK
      ? format(date, 'MMMM yyyy')
      : format(date, isMobile ? 'MMM d, yyyy' : 'MMMM d, yyyy');

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        px: 1.5,
        py: 1,
        ...(variant === 'inline' && {
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        }),
      }}
    >
      {/* Navigation and current period */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        <ButtonGroup variant="outlined" size="small">
          <Button onClick={onPrev} aria-label="Previous" sx={{ minWidth: 32, px: 0 }}>
            <ChevronLeft fontSize="small" />
          </Button>
          <Button onClick={onToday} sx={{ px: 1.5 }}>
            Today
          </Button>
          <Button onClick={onNext} aria-label="Next" sx={{ minWidth: 32, px: 0 }}>
            <ChevronRight fontSize="small" />
          </Button>
        </ButtonGroup>

        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>

      {/* View switcher and actions */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <ButtonGroup variant="outlined" size="small">
          {VIEW_OPTIONS.map(({ value, label, icon }) =>
            isMobile ? (
              <Button
                key={label}
                onClick={() => onViewChange(value)}
                variant={view === value ? 'contained' : 'outlined'}
                aria-label={`${label} view`}
                sx={{ minWidth: 40, px: 0 }}
              >
                {icon}
              </Button>
            ) : (
              <Button
                key={label}
                startIcon={icon}
                onClick={() => onViewChange(value)}
                variant={view === value ? 'contained' : 'outlined'}
                sx={{ px: 1.5 }}
              >
                {label}
              </Button>
            ),
          )}
        </ButtonGroup>

        {variant === 'inline' && (
          <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton
              size="small"
              onClick={onToggleFullscreen}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Share schedule as image">
          <IconButton
            size="small"
            onClick={onShare}
            disabled={capturing}
            aria-label="Share schedule as image"
          >
            {capturing ? <CapturingSpinner /> : <Share fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="More actions">
          <IconButton
            size="small"
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            aria-label="More actions"
            aria-haspopup="menu"
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>

        {variant === 'fullscreen' && (
          <IconButton onClick={onClose} aria-label="Close fullscreen">
            <Close fontSize="small" />
          </IconButton>
        )}
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onAddToGoogle();
          }}
        >
          <ListItemIcon>
            <Google fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add to Google Calendar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onExportIcs();
          }}
        >
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export .ics</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
