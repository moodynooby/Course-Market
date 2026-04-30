import { AppBar, type AppBarProps, useTheme } from '@mui/material';
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
