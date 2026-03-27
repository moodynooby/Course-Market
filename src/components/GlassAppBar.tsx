import {
  AppBar,
  Box,
  Card,
  type CardProps,
  type AppBarProps,
  alpha,
  useTheme,
} from '@mui/material';
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

/**
 * InfoCard - Card for displaying information panels
 * Consistent styling for dashboard panels
 */
export const InfoCard = forwardRef<HTMLDivElement, CardProps>(function InfoCard(props, ref) {
  return (
    <Card
      ref={ref}
      {...props}
      sx={{
        borderRadius: 4,
        bgcolor: 'surface.containerHighest',
        ...props.sx,
      }}
    >
      {props.children}
    </Card>
  );
});

/**
 * InteractiveCard - Card with hover effects for selection
 * Used for semester selection, course cards, etc.
 */
export const InteractiveCard = forwardRef<
  HTMLDivElement,
  CardProps & {
    selected?: boolean;
    disabled?: boolean;
  }
>(function InteractiveCard({ selected, disabled, ...props }, ref) {
  return (
    <Card
      ref={ref}
      {...props}
      sx={{
        height: '100%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: selected ? 2 : 1,
        borderColor: selected ? 'accent.main' : 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          borderColor: 'accent.main',
        },
        ...(disabled && {
          opacity: 0.6,
          '&:hover': {
            boxShadow: 'none',
          },
        }),
        ...props.sx,
      }}
    >
      {props.children}
    </Card>
  );
});

/**
 * ActionCard - Card with action buttons
 * For panels with primary actions
 */
export const ActionCard = forwardRef<HTMLDivElement, CardProps>(function ActionCard(props, ref) {
  return (
    <Card
      ref={ref}
      {...props}
      sx={{
        borderRadius: 4,
        bgcolor: 'surface.containerHigh',
        transition: 'all 0.3s ease',
        ...props.sx,
      }}
    >
      {props.children}
    </Card>
  );
});
