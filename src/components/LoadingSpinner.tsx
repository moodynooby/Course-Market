import { Box, CircularProgress, type CircularProgressProps } from '@mui/material';

interface LoadingSpinnerProps {
  size?: CircularProgressProps['size'];
  color?: CircularProgressProps['color'];
  fullScreen?: boolean;
  label?: string;
}

export function LoadingSpinner({
  size = 24,
  color = 'primary',
  fullScreen = false,
  label = 'Loading',
}: LoadingSpinnerProps) {
  const content = <CircularProgress size={size} color={color} aria-label={label} />;

  if (fullScreen) {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box role="status" aria-live="polite">
      {content}
    </Box>
  );
}
