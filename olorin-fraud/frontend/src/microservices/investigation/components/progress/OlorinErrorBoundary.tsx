/**
 * Olorin Component Error Boundary Wrapper
 * Feature: 007-progress-wizard-page (T077)
 *
 * Wraps Olorin visualization components with error boundaries for graceful failure handling.
 * Provides consistent fallback UI for component errors.
 */

import React, { ReactNode } from 'react';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';

interface OlorinErrorBoundaryProps {
  serviceName: string;
  children: ReactNode;
  fallbackMessage?: string;
}

/**
 * Wraps Olorin components with error boundary and consistent fallback UI
 */
export const OlorinErrorBoundary: React.FC<OlorinErrorBoundaryProps> = ({
  serviceName,
  children,
  fallbackMessage
}) => {
  const defaultMessage = `${serviceName} unavailable`;
  const message = fallbackMessage || defaultMessage;

  return (
    <ErrorBoundary
      serviceName={serviceName}
      fallback={
        <div className="p-4 bg-corporate-error/20 border border-corporate-error rounded text-red-300">
          {message}
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default OlorinErrorBoundary;
