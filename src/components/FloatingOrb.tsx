import { Box, useTheme } from '@mui/material';

interface FloatingOrbProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'tertiary' | 'error' | 'success' | 'primary';
  pulse?: boolean;
}

/**
 * FloatingOrb - Signature status indicator component
 * Per DESIGN.md: 8px circle with blur(4px) glow behind
 */
export function FloatingOrb({
  size = 'medium',
  color = 'tertiary',
  pulse = false,
}: FloatingOrbProps) {
  const theme = useTheme();

  const sizeMap = {
    small: { orb: 6, glow: 12 },
    medium: { orb: 8, glow: 16 },
    large: { orb: 12, glow: 24 },
  };

  const { orb, glow } = sizeMap[size];

  const colorMap = {
    tertiary: theme.palette.accent.main,
    error: theme.palette.error.main,
    success: theme.palette.success?.main || '#4caf50',
    primary: theme.palette.primary.main,
  };

  const orbColor = colorMap[color];

  return (
    <Box
      sx={{
        position: 'relative',
        width: orb,
        height: orb,
        borderRadius: '50%',
        backgroundColor: orbColor,
        ...(pulse && {
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
              transform: 'scale(1)',
            },
            '50%': {
              opacity: 0.7,
              transform: 'scale(0.95)',
            },
          },
        }),
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: glow,
          height: glow,
          borderRadius: '50%',
          backgroundColor: orbColor,
          filter: 'blur(4px)',
          opacity: 0.6,
          zIndex: -1,
        },
      }}
    />
  );
}
