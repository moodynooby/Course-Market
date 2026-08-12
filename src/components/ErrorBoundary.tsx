import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'grid', minHeight: '60vh', placeItems: 'center', p: 3 }}>
          <Stack spacing={2} sx={{ maxWidth: 520, textAlign: 'center' }}>
            <Typography variant="h5" component="h1">
              Something went wrong
            </Typography>
            <Alert severity="error" role="alert" sx={{ textAlign: 'left' }}>
              The page could not be displayed. Try again, or refresh the app if the problem
              continues.
            </Alert>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ justifyContent: 'center' }}
            >
              <Button variant="contained" onClick={this.handleRetry}>
                Try again
              </Button>
              <Button variant="outlined" onClick={this.handleRefresh}>
                Refresh app
              </Button>
            </Stack>
          </Stack>
        </Box>
      );
    }

    return this.props.children;
  }
}
