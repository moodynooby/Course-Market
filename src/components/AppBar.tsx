import { AppBar, Box, Card, type CardProps, type AppBarProps, useTheme } from '@mui/material';
import { forwardRef } from 'react';

/**
 * AppBar - MUI3 tonal elevation navigation bar
 * Per DESIGN.md: Uses surfaceContainerHigh for elevated navigation (no blur)
 */
export const AppBarElevated = forwardRef<HTMLDivElement, AppBarProps>(
  function AppBarElevated(props, ref) {
    const theme = useTheme();

    return (
      <AppBar
        ref={ref}
        elevation={0}
        {...props}
        sx={{
          background: theme.palette.background.paper || '#1f2020',
          borderBottom: 'none',
          ...props.sx,
        }}
      />
    );
  },
);

/**
 * CardElevated - MUI3 tonal elevation card
 * Uses surface color hierarchy for depth (no blur)
 */
export function CardElevated({
  children,
  level = 'high',
  ...props
}: {
  children: React.ReactNode;
  level?: 'low' | 'default' | 'high' | 'highest';
  sx?: any;
  [key: string]: any;
}) {
  const theme = useTheme();

  const bgColor =
    {
      low: theme.palette.background.default,
      default: theme.palette.background.default,
      high: theme.palette.background.paper,
      highest: theme.palette.background.paper,
    }[level] || theme.palette.background.paper;

  return (
    <Box
      sx={{
        background: bgColor,
        borderRadius: 32,
        border: 'none',
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
        bgcolor: 'background.paper',
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
        borderColor: selected ? 'secondary.main' : 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          borderColor: 'secondary.main',
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
        bgcolor: 'background.paper',
        transition: 'all 0.3s ease',
        ...props.sx,
      }}
    >
      {props.children}
    </Card>
  );
});
