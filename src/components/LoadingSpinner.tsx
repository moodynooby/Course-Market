import { Box, CircularProgress, type CircularProgressProps } from '@mui/material';

interface LoadingSpinnerProps {
  size?: CircularProgressProps['size'];
  color?: CircularProgressProps['color'];
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 24,
  color = 'primary',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = <CircularProgress size={size} color={color} />;

  if (fullScreen) {
    return (
      <Box
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

  return content;
}

export function LoadingPage({ message }: { message?: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      {message && <Box sx={{ color: 'text.secondary', mt: 1 }}>{message}</Box>}
    </Box>
  );
}
