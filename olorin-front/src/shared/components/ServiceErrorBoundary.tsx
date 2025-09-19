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
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('service:error', {
        service: serviceName,
        error: error.message,
        stack: error.stack,
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