import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  serviceName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId()
    };
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { serviceName, onError } = this.props;

    // Log error details
    console.error(`[Error Boundary${serviceName ? ` - ${serviceName}` : ''}] Error caught:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      serviceName,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Store error info in state
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to monitoring service
    this.reportError(error, errorInfo);

    // Emit error event for service monitoring
    this.emitServiceError(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      // Report to global monitoring service
      if (window.olorin?.monitoring) {
        window.olorin.monitoring.captureException(error, {
          context: this.props.serviceName || 'unknown',
          errorId: this.state.errorId,
          errorInfo,
          extra: {
            componentStack: errorInfo.componentStack,
            retryCount: this.retryCount,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Send to backend error tracking
      if (window.olorin?.config?.apiBaseUrl) {
        fetch(`${window.olorin.config.apiBaseUrl}/api/errors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            errorId: this.state.errorId,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            serviceName: this.props.serviceName,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            retryCount: this.retryCount
          })
        }).catch(reportingError => {
          console.warn('[Error Boundary] Failed to report error to backend:', reportingError);
        });
      }
    } catch (reportingError) {
      console.warn('[Error Boundary] Failed to report error:', reportingError);
    }
  }

  private emitServiceError(error: Error, errorInfo: ErrorInfo) {
    try {
      if (window.olorin?.eventBus && this.props.serviceName) {
        window.olorin.eventBus.emit('service:error', {
          service: this.props.serviceName,
          error: error.message,
          errorId: this.state.errorId,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          retryCount: this.retryCount
        });
      }
    } catch (emitError) {
      console.warn('[Error Boundary] Failed to emit service error:', emitError);
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`[Error Boundary] Retrying... (${this.retryCount}/${this.maxRetries})`);

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: this.generateErrorId()
      });
    } else {
      console.warn('[Error Boundary] Maximum retry attempts reached');
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorDetails() {
    const { error, errorInfo } = this.state;

    if (process.env.NODE_ENV !== 'development' || !error) {
      return null;
    }

    return (
      <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
        <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
          Error Details (Development Only)
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <strong className="text-red-600">Error Message:</strong>
            <pre className="mt-1 whitespace-pre-wrap text-red-700">{error.message}</pre>
          </div>
          {error.stack && (
            <div>
              <strong className="text-red-600">Stack Trace:</strong>
              <pre className="mt-1 whitespace-pre-wrap text-red-700 text-xs">{error.stack}</pre>
            </div>
          )}
          {errorInfo?.componentStack && (
            <div>
              <strong className="text-red-600">Component Stack:</strong>
              <pre className="mt-1 whitespace-pre-wrap text-red-700 text-xs">{errorInfo.componentStack}</pre>
            </div>
          )}
          <div>
            <strong className="text-gray-600">Error ID:</strong>
            <code className="ml-1 text-gray-700">{this.state.errorId}</code>
          </div>
          <div>
            <strong className="text-gray-600">Service:</strong>
            <code className="ml-1 text-gray-700">{this.props.serviceName || 'unknown'}</code>
          </div>
          <div>
            <strong className="text-gray-600">Retry Count:</strong>
            <code className="ml-1 text-gray-700">{this.retryCount}/{this.maxRetries}</code>
          </div>
        </div>
      </details>
    );
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const serviceName = this.props.serviceName || 'Application';
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              {serviceName} Error
            </h1>

            <p className="text-gray-600 text-center mb-4">
              Something went wrong with the {serviceName.toLowerCase()} service.
              {canRetry ? ' You can try again or reload the page.' : ' Please reload the page or contact support.'}
            </p>

            <div className="text-center mb-4">
              <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Error ID: {this.state.errorId}
              </code>
            </div>

            <div className="flex flex-col space-y-2">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Go to Home
              </button>
            </div>

            {this.renderErrorDetails()}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;