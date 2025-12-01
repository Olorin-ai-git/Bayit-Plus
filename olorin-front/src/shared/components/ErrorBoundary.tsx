/**
 * Error Boundary Component
 *
 * React error boundary for graceful error handling.
 * Captures component errors and displays fallback UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for React components
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-corporate-bgPrimary p-4">
          <div className="max-w-md w-full bg-corporate-bgSecondary border-2 border-corporate-error rounded-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-corporate-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-corporate-textPrimary mb-2">
                  Something went wrong
                </h2>
                <p className="text-sm text-corporate-textSecondary mb-4">
                  An unexpected error occurred. Please try again.
                </p>

                {process.env.REACT_APP_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="text-sm font-medium text-corporate-textTertiary cursor-pointer hover:text-corporate-textSecondary">
                      Error Details
                    </summary>
                    <div className="mt-2 p-3 bg-corporate-bgPrimary rounded text-xs font-mono text-corporate-textTertiary overflow-x-auto overflow-y-auto max-h-60 w-full">
                      <p className="mb-2 text-corporate-error break-words">
                        {this.state.error.toString()}
                      </p>
                      {this.state.errorInfo && (
                        <pre className="whitespace-pre-wrap break-all">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}

                <button
                  onClick={this.handleReset}
                  className="mt-4 w-full px-4 py-2 bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white font-medium rounded transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
