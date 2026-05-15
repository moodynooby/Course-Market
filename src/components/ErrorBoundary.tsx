import { Box, Button, Typography } from '@mui/material';
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

  override render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {this.state.error?.message ||
              'An unexpected error occurred. Please try again or refresh the page.'}
          </Typography>
          <Button variant="outlined" onClick={this.handleRetry}>
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
