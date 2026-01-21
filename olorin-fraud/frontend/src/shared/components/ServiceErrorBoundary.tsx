/**
 * Service Error Boundary Component
 * Feature: 002-visualization-microservice
 *
 * Catches errors from microservices and provides graceful fallback UI.
 * Prevents one failing service from crashing the entire application.
 *
 * @module shared/components/ServiceErrorBoundary
 */

import React, { Component, ReactNode } from 'react';

interface ServiceErrorBoundaryProps {
  serviceName: string;
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ServiceErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ServiceErrorBoundary extends Component<
  ServiceErrorBoundaryProps,
  ServiceErrorBoundaryState
> {
  constructor(props: ServiceErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ServiceErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { serviceName, onError } = this.props;

    console.error(`[ServiceErrorBoundary] Error in ${serviceName}:`, {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    this.setState({ errorInfo });

    if (onError) {
      onError(error, errorInfo);
    }

    // Publish error event for monitoring
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:error', {
        service: serviceName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, serviceName } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-900/20 border-2 border-red-500 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg
                className="w-8 h-8 text-red-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-xl font-bold text-red-400">Service Unavailable</h2>
            </div>

            <p className="text-red-300 mb-4">
              The <span className="font-semibold">{serviceName}</span> service encountered an error and is temporarily unavailable.
            </p>

            {error && (
              <div className="bg-gray-900/50 border border-red-700 rounded p-3 mb-4">
                <p className="text-xs font-mono text-red-300 break-words">
                  {error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors font-medium"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors font-medium"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
