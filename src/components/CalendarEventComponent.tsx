import { Box, Tooltip, Typography } from '@mui/material';
import { format } from 'date-fns';
import { memo } from 'react';
import type { CalendarEvent } from '../types';

interface EventProps {
  event: CalendarEvent;
  onSelect?: (event: CalendarEvent) => void;
  touchFriendly?: boolean;
}

export const COURSE_COLORS = [
  '#c87a2a',
  '#0891b2',
  '#7c3aed',
  '#059669',
  '#dc2626',
  '#ea580c',
  '#1cb0f6',
  '#be185d',
];

export const EventComponent = memo(function EventComponent({
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

  // sheet instead. On desktop the tooltip remains for instant previews.
  if (touchFriendly && onSelect) {
    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={(eventClick) => {
          eventClick.stopPropagation();
          onSelect(event);
        }}
        onKeyDown={(eventKey) => {
          if (eventKey.key === 'Enter' || eventKey.key === ' ') {
            eventKey.preventDefault();
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
          borderRadius: 1.5,
          borderLeft: '3px solid rgba(255, 255, 255, 0.65)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
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
