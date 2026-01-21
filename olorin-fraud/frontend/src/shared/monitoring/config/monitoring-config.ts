/**
 * Performance Monitoring Configuration
 * Configuration-driven settings from environment variables
 * Feature: Performance monitoring and optimization
 *
 * SYSTEM MANDATE: All configuration values from process.env
 * NO hardcoded values allowed
 */

import type { PerformanceMonitorConfig, WebVitalsThresholds } from '../types/performance-types';

/**
 * Load performance monitoring configuration from environment variables
 * All values come from process.env - NO hardcoded defaults
 */
export function loadMonitoringConfig(): PerformanceMonitorConfig {
  return {
    endpoint: process.env.REACT_APP_PERFORMANCE_ENDPOINT || '',
    apiKey: process.env.REACT_APP_PERFORMANCE_API_KEY || '',
    batchSize: parseInt(
      process.env.REACT_APP_PERFORMANCE_BATCH_SIZE || '0',
      10
    ),
    flushInterval: parseInt(
      process.env.REACT_APP_PERFORMANCE_FLUSH_INTERVAL_MS || '0',
      10
    ),
    maxMetrics: parseInt(
      process.env.REACT_APP_PERFORMANCE_MAX_METRICS || '0',
      10
    ),
    enableWebVitals: process.env.REACT_APP_PERFORMANCE_ENABLE_WEB_VITALS === 'true',
    enableResourceTiming: process.env.REACT_APP_PERFORMANCE_ENABLE_RESOURCE_TIMING === 'true',
    enableUserTiming: process.env.REACT_APP_PERFORMANCE_ENABLE_USER_TIMING === 'true',
    enableMemoryMonitoring: process.env.REACT_APP_PERFORMANCE_ENABLE_MEMORY === 'true',
    enableNetworkMonitoring: process.env.REACT_APP_PERFORMANCE_ENABLE_NETWORK === 'true',
    serviceName: process.env.REACT_APP_SERVICE_NAME || '',
  };
}

/**
 * Web Vitals thresholds from environment variables
 */
export function loadWebVitalsThresholds(): WebVitalsThresholds {
  return {
    FCP: {
      good: parseFloat(process.env.REACT_APP_WEB_VITALS_FCP_GOOD || '0'),
      poor: parseFloat(process.env.REACT_APP_WEB_VITALS_FCP_POOR || '0'),
    },
    LCP: {
      good: parseFloat(process.env.REACT_APP_WEB_VITALS_LCP_GOOD || '0'),
      poor: parseFloat(process.env.REACT_APP_WEB_VITALS_LCP_POOR || '0'),
    },
    FID: {
      good: parseFloat(process.env.REACT_APP_WEB_VITALS_FID_GOOD || '0'),
      poor: parseFloat(process.env.REACT_APP_WEB_VITALS_FID_POOR || '0'),
    },
    CLS: {
      good: parseFloat(process.env.REACT_APP_WEB_VITALS_CLS_GOOD || '0'),
      poor: parseFloat(process.env.REACT_APP_WEB_VITALS_CLS_POOR || '0'),
    },
  };
}

/**
 * Validate monitoring configuration
 * Throws error if required configuration is missing
 */
export function validateMonitoringConfig(config: PerformanceMonitorConfig): void {
  const errors: string[] = [];

  if (!config.endpoint) {
    errors.push('REACT_APP_PERFORMANCE_ENDPOINT is required');
  }

  if (!config.apiKey) {
    errors.push('REACT_APP_PERFORMANCE_API_KEY is required');
  }

  if (config.batchSize <= 0) {
    errors.push('REACT_APP_PERFORMANCE_BATCH_SIZE must be > 0');
  }

  if (config.flushInterval <= 0) {
    errors.push('REACT_APP_PERFORMANCE_FLUSH_INTERVAL_MS must be > 0');
  }

  if (config.maxMetrics <= 0) {
    errors.push('REACT_APP_PERFORMANCE_MAX_METRICS must be > 0');
  }

  if (errors.length > 0) {
    throw new Error(
      `Performance monitoring configuration invalid:\n${errors.join('\n')}`
    );
  }
}

/**
 * Get default monitoring configuration (for development/testing)
 * Uses environment variables with validation
 */
export function getMonitoringConfig(): PerformanceMonitorConfig {
  const config = loadMonitoringConfig();
  validateMonitoringConfig(config);
  return config;
}

/**
 * Get Web Vitals thresholds with validation
 */
export function getWebVitalsThresholds(): WebVitalsThresholds {
  return loadWebVitalsThresholds();
}
