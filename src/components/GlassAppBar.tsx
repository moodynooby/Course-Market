import { AppBar, Box, type AppBarProps, alpha, useTheme } from '@mui/material';
import { forwardRef } from 'react';

/**
 * GlassAppBar - Signature glassmorphic navigation bar
 * Per DESIGN.md: surface-container colors at 70% opacity with 20px backdrop-blur
 */
export const GlassAppBar = forwardRef<HTMLDivElement, AppBarProps>(
  function GlassAppBar(props, ref) {
    const theme = useTheme();

    return (
      <AppBar
        ref={ref}
        elevation={0}
        {...props}
        sx={{
          background: alpha(theme.palette.surface?.containerHigh || '#1f2020', 0.7),
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: 'none',
          ...props.sx,
        }}
      />
    );
  },
);

/**
 * GlassCard - Floating card with glassmorphism effect
 * For use in layered layouts
 */
export function GlassCard({
  children,
  intensity = 0.7,
  ...props
}: {
  children: React.ReactNode;
  intensity?: number;
  sx?: any;
  [key: string]: any;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        background: alpha(theme.palette.surface?.containerHigh || '#1f2020', intensity),
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
