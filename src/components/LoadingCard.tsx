import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Typography,
  alpha,
} from '@mui/material';
import type { ReactNode } from 'react';

interface LoadingCardProps {
  message?: string;
  progress?: number;
  progressLabel?: string;
  icon?: ReactNode;
  fullHeight?: boolean;
}

export function LoadingCard({
  message = 'Loading...',
  progress,
  progressLabel,
  icon,
  fullHeight = false,
}: LoadingCardProps) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        bgcolor: 'surface.containerHigh',
        height: fullHeight ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CardContent sx={{ py: 4, px: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {icon || <CircularProgress size={40} />}

          <Typography
            variant="body2"
            align="center"
            sx={{
              color: 'text.secondary',
            }}
          >
            {message}
          </Typography>

          {progress !== undefined && (
            <Box sx={{ width: '100%', maxWidth: 200 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 6, borderRadius: 3, mb: 1 }}
              />
              {progressLabel && (
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    color: 'text.secondary',
                    display: 'block',
                  }}
                >
                  {progressLabel}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
  progressLabel?: string;
}

export function LoadingOverlay({ message, progress, progressLabel }: LoadingOverlayProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha('#1f2020', 0.9),
        backdropFilter: 'blur(4px)',
        zIndex: 10,
      }}
    >
      <LoadingCard message={message} progress={progress} progressLabel={progressLabel} />
    </Box>
  );
}
