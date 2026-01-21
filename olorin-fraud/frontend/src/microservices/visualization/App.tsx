/**
 * Visualization Microservice Main Application Component
 *
 * This is the root component of the Visualization Microservice.
 * It provides:
 * - Application-level error boundaries
 * - Configuration context for child components
 * - Service health status display
 * - Development mode information
 *
 * The component receives validated configuration from the bootstrap layer
 * and makes it available to all child components via React context.
 */

import React from 'react';
import { VisualizationConfig } from './config/validation';
import { VisualizationErrorBoundary } from './components/ErrorBoundary';

interface VisualizationAppProps {
  config: VisualizationConfig;
}

const VisualizationApp: React.FC<VisualizationAppProps> = ({ config }) => {
  const isDevelopment = config.service.environment === 'development';
  const enabledFeatures = Object.entries(config.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);

  return (
    <VisualizationErrorBoundary>
      <div className="min-h-screen bg-corporate-bgPrimary">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-corporate-bgSecondary border border-corporate-borderPrimary rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-corporate-textPrimary">
                Visualization Microservice
              </h1>

              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 bg-corporate-success rounded-full animate-pulse" />
                <span className="text-corporate-textSecondary text-sm">Running</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-corporate-textPrimary mb-2">
                    Service Information
                  </h2>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-corporate-textTertiary">Environment:</dt>
                      <dd className="text-corporate-textPrimary font-medium">
                        {config.service.environment}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-corporate-textTertiary">Port:</dt>
                      <dd className="text-corporate-textPrimary font-medium">
                        {config.service.port}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-corporate-textTertiary">Event Bus:</dt>
                      <dd className="text-corporate-textPrimary font-medium">
                        {config.eventBus.type}
                      </dd>
                    </div>
                  </dl>
                </div>

                {isDevelopment && (
                  <div className="bg-corporate-bgTertiary border border-corporate-borderSecondary rounded p-4">
                    <h3 className="text-sm font-semibold text-corporate-textPrimary mb-2">
                      Development Mode
                    </h3>
                    <p className="text-xs text-corporate-textTertiary">
                      Debug logging: {config.service.enableDebugLogging ? 'Enabled' : 'Disabled'}
                    </p>
                    <p className="text-xs text-corporate-textTertiary">
                      Log level: {config.service.logLevel}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-corporate-textPrimary mb-2">
                  Features Enabled
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {enabledFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center space-x-2 text-sm text-corporate-textSecondary"
                    >
                      <svg
                        className="h-4 w-4 text-corporate-success"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="capitalize">
                        {feature.replace(/^enable/, '').replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-corporate-borderPrimary">
              <p className="text-center text-corporate-textTertiary text-sm">
                Configuration validated successfully. Service ready for visualization rendering.
              </p>
            </div>
          </div>
        </div>
      </div>
    </VisualizationErrorBoundary>
  );
};

export default VisualizationApp;
