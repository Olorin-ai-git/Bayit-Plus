/**
 * Analytics Microservice Bootstrap Entry Point
 *
 * Module Federation entry point for analytics microservice.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import AnalyticsApp from './AnalyticsApp';

declare global {
  interface Window {
    __analytics_root__?: Root;
  }
}

interface ConfigErrorBoundaryProps {
  error: Error;
}

const ConfigErrorBoundary: React.FC<ConfigErrorBoundaryProps> = ({
  error,
}) => {
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
              The Analytics Microservice failed to start due to invalid or
              missing configuration.
            </p>

            <div className="bg-corporate-bgPrimary border border-corporate-borderPrimary rounded p-4 mb-4">
              <p className="text-sm text-red-300 font-mono">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function bootstrapAnalyticsMicroservice() {
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Analytics Microservice bootstrap starting');
  }

  const rootElement = document.getElementById('analytics-root') || document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element #analytics-root or #root not found');
  }

  // Check if React already has a root on this element
  const elementAny = rootElement as any;
  const hasReactRoot = !!(
    elementAny._reactRootContainer ||
    elementAny._reactInternalFiber ||
    elementAny.__reactContainer$ ||
    elementAny.__reactFiber$ ||
    elementAny[Symbol.for('react.root')]
  );

  // If React has a root but we don't have the reference, try to reuse it
  if (hasReactRoot && !window.__analytics_root__) {
    // Try to get the existing root from React's internal state
    // If that fails, we'll create a new one
    try {
      // React 18 stores root in a symbol
      const existingRoot = elementAny[Symbol.for('react.root')];
      if (existingRoot) {
        window.__analytics_root__ = existingRoot as Root;
      }
    } catch (e) {
      // Ignore - we'll create a new root
    }
  }

  // Create root only if we don't have one
  if (!window.__analytics_root__) {
    // Suppress React warning about duplicate roots during development
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (message.includes('createRoot') && message.includes('already been passed')) {
        // Try to reuse existing root
        try {
          const existingRoot = elementAny[Symbol.for('react.root')];
          if (existingRoot) {
            window.__analytics_root__ = existingRoot as Root;
            return; // Suppress warning
          }
        } catch (e) {
          // Continue to create new root
        }
      }
      originalWarn.apply(console, args);
    };

    try {
      window.__analytics_root__ = createRoot(rootElement);
    } catch (error: any) {
      console.warn = originalWarn;
      // If createRoot fails due to existing root, try to render on existing root
      if (error?.message?.includes('already been passed')) {
        const existingRoot = elementAny[Symbol.for('react.root')];
        if (existingRoot) {
          window.__analytics_root__ = existingRoot as Root;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    } finally {
      console.warn = originalWarn;
    }
  }

  const root = window.__analytics_root__;
  root.render(
    <React.StrictMode>
      <AnalyticsApp />
    </React.StrictMode>
  );

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Analytics Microservice bootstrap successful');
  }
}

if (process.env.NODE_ENV === 'development') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    bootstrapAnalyticsMicroservice();
  }
}

export default bootstrapAnalyticsMicroservice;

