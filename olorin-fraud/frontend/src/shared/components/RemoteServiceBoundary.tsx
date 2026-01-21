/**
 * Remote Service Error Boundary
 * Gracefully handles failures when loading remote microservices via Module Federation
 */

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  serviceName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RemoteServiceBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[RemoteServiceBoundary] Error loading ${this.props.serviceName}:`, error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Emit error event for monitoring
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:load-error', {
        service: this.props.serviceName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-corporate-bgPrimary flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-corporate-bgSecondary border-2 border-yellow-500/50 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                  Service Unavailable
                </h3>
                <p className="text-sm text-corporate-textSecondary mb-2">
                  The <strong>{this.props.serviceName}</strong> service is currently unavailable.
                </p>
                <p className="text-xs text-corporate-textTertiary mb-4">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                  }}
                  className="px-4 py-2 text-sm font-medium text-corporate-textPrimary bg-corporate-accentPrimary/20 hover:bg-corporate-accentPrimary/30 rounded border border-corporate-accentPrimary/50 transition-colors"
                >
                  Retry
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

