import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback UI. When omitted the default error card is shown. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global ErrorBoundary that catches React rendering errors,
 * displays a user-friendly message, and provides a retry button.
 *
 * Apple-style colors: background #0D1117/#161B22, accent #58A6FF, text #C9D1D9.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught rendering error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            p: 4,
          }}
        >
          <Box
            sx={{
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              p: 5,
              borderRadius: 3,
              background: '#161B22',
              border: '1px solid rgba(88, 166, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <ErrorOutline
              sx={{
                fontSize: 56,
                color: '#58A6FF',
                mb: 2,
                opacity: 0.8,
              }}
            />

            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#C9D1D9',
                mb: 1.5,
              }}
            >
              Something went wrong
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: 'rgba(201, 209, 217, 0.6)',
                mb: 3,
                lineHeight: 1.6,
              }}
            >
              An unexpected error occurred while rendering this page.
              Please try again, or refresh the browser if the issue persists.
            </Typography>

            {this.state.error && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: 1.5,
                  background: '#0D1117',
                  border: '1px solid rgba(88, 166, 255, 0.08)',
                  textAlign: 'left',
                  maxHeight: 120,
                  overflow: 'auto',
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(88, 166, 255, 0.2)',
                    borderRadius: 2,
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.75rem',
                    color: 'rgba(201, 209, 217, 0.5)',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.message}
                </Typography>
              </Box>
            )}

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={this.handleRetry}
              sx={{
                borderColor: 'rgba(88, 166, 255, 0.4)',
                color: '#58A6FF',
                fontWeight: 600,
                textTransform: 'none',
                px: 4,
                py: 1,
                '&:hover': {
                  borderColor: '#58A6FF',
                  bgcolor: 'rgba(88, 166, 255, 0.08)',
                },
              }}
            >
              Try Again
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * A lightweight wrapper for wrapping individual pages in an ErrorBoundary.
 * Usage: <PageErrorBoundary><MyPage /></PageErrorBoundary>
 */
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
