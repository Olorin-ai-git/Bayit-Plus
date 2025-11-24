<<<<<<< HEAD
import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface ServiceErrorBoundaryProps {
  serviceName: string;
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{
    error: Error;
    serviceName: string;
    retry: () => void;
  }>;
}

const ServiceErrorBoundary: React.FC<ServiceErrorBoundaryProps> = ({
  serviceName,
  children,
  fallbackComponent: FallbackComponent
}) => {
  const handleServiceError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`[${serviceName} Service] Error caught by service boundary:`, {
      service: serviceName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Emit service-specific error event
=======
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
>>>>>>> 001-modify-analyzer-method
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:error', {
        service: serviceName,
        error: error.message,
        stack: error.stack,
<<<<<<< HEAD
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        severity: 'high',
        type: 'component_error'
      });
    }

    // Mark service as degraded
    if (window.olorin?.services?.serviceDiscovery) {
      const serviceDiscovery = window.olorin.getService('serviceDiscovery');
      const service = serviceDiscovery?.getService(serviceName);
      if (service) {
        service.status = 'error';
        service.health = {
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          uptime: 0
        };
      }
    }
  };

  const renderFallback = () => {
    if (FallbackComponent) {
      return (
        <FallbackComponent
          error={new Error(`${serviceName} service error`)}
          serviceName={serviceName}
          retry={() => window.location.reload()}
        />
      );
    }

    return (
      <div className="min-h-64 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h3 className="text-lg font-medium text-red-900 mb-2">
            {serviceName} Service Unavailable
          </h3>

          <p className="text-red-700 mb-4">
            The {serviceName.toLowerCase()} service is currently experiencing issues.
            Other services remain available.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Retry Service
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full border border-red-300 text-red-700 px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>

          <div className="mt-4 text-xs text-red-600">
            Service: {serviceName} | Time: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary
      serviceName={serviceName}
      onError={handleServiceError}
      fallback={renderFallback()}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ServiceErrorBoundary;
=======
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
>>>>>>> 001-modify-analyzer-method
