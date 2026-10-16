import { alpha, Box, Paper, Stack, Typography, useTheme } from '@mui/material';
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
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: theme.palette.divider,
      }}
    >
      <Box
        sx={{
          width: iconSize,
          height: iconSize,
          borderRadius: 2.5,
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.08),
          border: '1px solid',
          borderColor: alpha(
            theme.palette.primary.main,
            theme.palette.mode === 'dark' ? 0.25 : 0.15,
          ),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          color: 'primary.main',
        }}
      >
        {icon}
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
