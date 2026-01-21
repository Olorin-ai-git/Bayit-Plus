/**
 * Visualization Microservice Bootstrap Entry Point
 *
 * This is the main entry point for the Visualization Microservice.
 * It performs critical initialization steps before rendering the application:
 *
 * 1. Load and validate configuration from environment variables
 * 2. Set up error boundaries for graceful failure handling
 * 3. Initialize the main application component
 *
 * Configuration Validation:
 * - Fails fast if required environment variables are missing
 * - Displays clear error messages for configuration issues
 * - Prevents service startup with invalid configuration
 *
 * This module is exposed via Webpack Module Federation for consumption
 * by the shell application.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { getVisualizationConfig } from './config/environment';
import VisualizationApp from './VisualizationApp';

// Global reference to prevent creating multiple roots
declare global {
  interface Window {
    __visualization_root__?: Root;
  }
}

/**
 * Error Boundary for Configuration Failures
 *
 * Displays a user-friendly error message when configuration loading fails.
 * This ensures users get clear feedback about what went wrong.
 */
interface ConfigErrorBoundaryProps {
  error: Error;
}

const ConfigErrorBoundary: React.FC<ConfigErrorBoundaryProps> = ({ error }) => {
  return (
    <div className="min-h-screen bg-corporate-bgPrimary flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-corporate-bgSecondary border-2 border-red-500 rounded-lg p-8">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-red-400 mb-2">
              Configuration Error
            </h1>

            <p className="text-corporate-textSecondary mb-4">
              The Visualization Microservice failed to start due to invalid or missing configuration.
            </p>

            <div className="bg-corporate-bgPrimary border border-corporate-borderPrimary rounded p-4 mb-4">
              <p className="text-sm text-red-300 font-mono">{error.message}</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-corporate-textPrimary">
                How to Fix:
              </h2>
              <ol className="list-decimal list-inside space-y-1 text-corporate-textSecondary text-sm">
                <li>Check your environment variables are properly set</li>
                <li>Ensure all REQUIRED variables are provided (see .env.example)</li>
                <li>Verify variable values match the expected format</li>
                <li>Restart the service after fixing configuration</li>
              </ol>
            </div>

            {process.env.REACT_APP_DOCS_URL && (
              <div className="mt-6">
                <a
                  href={process.env.REACT_APP_DOCS_URL}
                  className="text-corporate-accentPrimary hover:text-corporate-accentPrimaryHover underline"
                >
                  View Configuration Documentation
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Bootstrap Function
 *
 * Initializes the visualization microservice with proper error handling.
 * This function is called when the microservice is loaded by the shell.
 */
export function bootstrapVisualizationMicroservice() {
  let config;

  try {
    config = getVisualizationConfig();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Failed to load Visualization Microservice configuration');
    }
    const rootElement = document.getElementById('visualization-root');
    if (rootElement) {
      if (!window.__visualization_root__) {
        window.__visualization_root__ = createRoot(rootElement);
      }
      const root = window.__visualization_root__;
      root.render(<ConfigErrorBoundary error={error as Error} />);
    }
    throw error;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Visualization Microservice bootstrap successful');
    console.log(`   Service: ${config.service.baseUrl}`);
    console.log(`   Environment: ${config.service.environment}`);
  }

  const rootElement = document.getElementById('visualization-root');
  if (!rootElement) {
    throw new Error('Root element #visualization-root not found');
  }

  // Prevent multiple root creation
  if (!window.__visualization_root__) {
    window.__visualization_root__ = createRoot(rootElement);
  }

  const root = window.__visualization_root__;
  root.render(
    <React.StrictMode>
      <VisualizationApp config={config} />
    </React.StrictMode>
  );
}

/**
 * Auto-bootstrap if running in standalone mode
 *
 * This allows the microservice to run independently during development.
 * In production, the shell application will call bootstrapVisualizationMicroservice().
 */
if (process.env.NODE_ENV === 'development') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    bootstrapVisualizationMicroservice();
  }
}

/**
 * Default export for Module Federation
 */
export default bootstrapVisualizationMicroservice;
