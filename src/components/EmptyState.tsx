import { Box, CircularProgress, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

export type EmptyStateVariant = 'default' | 'compact' | 'fullscreen';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: EmptyStateVariant;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const theme = useTheme();

  const variantStyles = {
    default: {
      p: 4,
      minHeight: 200,
      maxWidth: 500,
    },
    compact: {
      p: 3,
      minHeight: 150,
      maxWidth: 400,
    },
    fullscreen: {
      p: 5,
      minHeight: '100%',
      maxWidth: 600,
    },
  };

  const iconSizes = {
    default: 60,
    compact: 48,
    fullscreen: 80,
  };

  const iconSize = iconSizes[variant];

  return (
    <Paper
      variant="outlined"
      sx={{
        ...variantStyles[variant],
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        borderRadius: 4,
        bgcolor: 'surface.containerHigh',
      }}
    >
      <Box
        sx={{
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: iconSize * 0.5,
            height: iconSize * 0.5,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.3),
            filter: 'blur(8px)',
            position: 'absolute',
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1, color: 'primary.main' }}>{icon}</Box>
      </Box>
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          fontWeight: 700,
        }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            maxWidth: 400,
            mb: action ? 2 : 0,
          }}
        >
          {description}
        </Typography>
      )}
      {action && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {action}
        </Stack>
      )}
    </Paper>
  );
}

interface LoadingStateProps {
  message?: string;
  variant?: 'default' | 'fullscreen';
}

export function LoadingState({ message = 'Loading...', variant = 'default' }: LoadingStateProps) {
  const isFullscreen = variant === 'fullscreen';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: isFullscreen ? '100vh' : 200,
        py: 4,
      }}
    >
      <CircularProgress sx={{ mb: 2 }} />
      {message && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}
