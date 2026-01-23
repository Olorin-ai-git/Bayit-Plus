/**
 * Feature Flag Provider for staged rollout and instant rollback
 *
 * Uses GrowthBook for A/B testing, gradual rollouts, and feature flags.
 * Enables instant rollback without redeployment.
 *
 * @module FeatureFlagProvider
 */

import React, { useEffect } from 'react';
import { GrowthBook, GrowthBookProvider } from '@growthbook/growthbook-react';
import logger from '@/utils/logger';

// Initialize GrowthBook instance
const growthbook = new GrowthBook({
  apiHost: process.env.REACT_APP_GROWTHBOOK_API_HOST || 'https://cdn.growthbook.io',
  clientKey: process.env.REACT_APP_GROWTHBOOK_CLIENT_KEY || '',
  enableDevMode: process.env.NODE_ENV === 'development',
  // Track feature usage for analytics
  trackingCallback: (experiment, result) => {
    logger.debug('Experiment viewed', 'FeatureFlagProvider', {
      experimentId: experiment.key,
      variationId: result.variationId,
      value: result.value,
    });

    // Send to analytics (Sentry, GA, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'experiment_viewed', {
        experiment_id: experiment.key,
        variation_id: result.variationId,
      });
    }
  },
});

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

/**
 * Feature Flag Provider Component
 *
 * Wrap your app with this provider to enable feature flags.
 *
 * Usage:
 * ```tsx
 * import { FeatureFlagProvider } from '@/providers/FeatureFlagProvider';
 *
 * function App() {
 *   return (
 *     <FeatureFlagProvider>
 *       <YourApp />
 *     </FeatureFlagProvider>
 *   );
 * }
 * ```
 */
export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  useEffect(() => {
    // Load feature definitions from GrowthBook API
    growthbook.loadFeatures();

    // Set user attributes for targeting
    growthbook.setAttributes({
      id: getUserId(),
      email: getUserEmail(),
      country: getUserCountry(),
      browser: getBrowser(),
      deviceType: getDeviceType(),
      // Add more targeting attributes as needed
    });

    // Auto-refresh features every 60 seconds
    const interval = setInterval(() => {
      growthbook.loadFeatures();
    }, 60000);

    return () => {
      clearInterval(interval);
      growthbook.destroy();
    };
  }, []);

  return (
    <GrowthBookProvider growthbook={growthbook}>
      {children}
    </GrowthBookProvider>
  );
}

// Helper functions for user attributes
function getUserId(): string {
  // Get from auth context or localStorage
  return localStorage.getItem('userId') || 'anonymous';
}

function getUserEmail(): string | undefined {
  // Get from auth context
  return localStorage.getItem('userEmail') || undefined;
}

function getUserCountry(): string {
  // Get from IP geolocation or browser
  return navigator.language.split('-')[1] || 'US';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'chrome';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari')) return 'safari';
  if (ua.includes('Edge')) return 'edge';
  return 'other';
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Re-export GrowthBook hooks for convenience
export { useFeature, useFeatureValue, useExperiment } from '@growthbook/growthbook-react';
