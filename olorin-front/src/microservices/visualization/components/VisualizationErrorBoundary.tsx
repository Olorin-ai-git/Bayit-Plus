import React, { Component, ErrorInfo, ReactNode } from 'react';

interface VisualizationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface VisualizationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class VisualizationErrorBoundary extends Component<
  VisualizationErrorBoundaryProps,
  VisualizationErrorBoundaryState
> {
  constructor(props: VisualizationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<VisualizationErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    console.error('[Visualization Error Boundary] Caught error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    this.props.onError?.(error, errorInfo);
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
        <div className="visualization-error-boundary min-h-screen flex items-center justify-center bg-gray-950 p-6">
          <div className="max-w-2xl w-full bg-red-900/20 border-2 border-red-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <svg
                className="w-12 h-12 text-red-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-red-300 mb-2">
                  Visualization Error
                </h2>
                <p className="text-sm text-red-200 mb-4">
                  The visualization microservice encountered an unexpected error and could not render.
                </p>

                {this.state.error && (
                  <div className="bg-gray-900/50 border border-red-700 rounded p-3 mb-4">
                    <p className="text-xs font-mono text-red-300 break-all">
                      {this.state.error.toString()}
                    </p>
                  </div>
                )}

                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-red-300 hover:text-red-200 mb-2">
                      Component Stack Trace
                    </summary>
                    <pre className="text-xs font-mono text-red-200 bg-gray-900/50 border border-red-700 rounded p-3 overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-sm font-medium"
                    aria-label="Try again"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors text-sm font-medium"
                    aria-label="Reload page"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
