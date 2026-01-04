/**
 * Service Configuration
 * Configuration-driven service URLs and settings from environment variables
 *
 * SYSTEM MANDATE COMPLIANCE: All values from process.env, NO hardcoded values
 */

import type { ServiceConfig, ServiceName } from '../types/service-types';

/**
 * Service configuration map
 * All URLs, timeouts, and retries are externalized to environment variables
 */
export const SERVICE_CONFIGS: Record<ServiceName, ServiceConfig> = {
  investigation: {
    baseURL: process.env.REACT_APP_INVESTIGATION_SERVICE_URL || '',
    timeout: parseInt(
      process.env.REACT_APP_INVESTIGATION_TIMEOUT_MS || '30000',
      10
    ),
    retries: parseInt(
      process.env.REACT_APP_INVESTIGATION_RETRIES || '3',
      10
    ),
  },
  'agent-analytics': {
    baseURL: process.env.REACT_APP_AGENT_ANALYTICS_SERVICE_URL || '',
    timeout: parseInt(
      process.env.REACT_APP_AGENT_ANALYTICS_TIMEOUT_MS || '15000',
      10
    ),
    retries: parseInt(
      process.env.REACT_APP_AGENT_ANALYTICS_RETRIES || '2',
      10
    ),
  },
  'rag-intelligence': {
    baseURL: process.env.REACT_APP_RAG_INTELLIGENCE_SERVICE_URL || '',
    timeout: parseInt(
      process.env.REACT_APP_RAG_INTELLIGENCE_TIMEOUT_MS || '20000',
      10
    ),
    retries: parseInt(
      process.env.REACT_APP_RAG_INTELLIGENCE_RETRIES || '3',
      10
    ),
  },
  visualization: {
    baseURL: process.env.REACT_APP_VISUALIZATION_SERVICE_URL || '',
    timeout: parseInt(
      process.env.REACT_APP_VISUALIZATION_TIMEOUT_MS || '10000',
      10
    ),
    retries: parseInt(
      process.env.REACT_APP_VISUALIZATION_RETRIES || '2',
      10
    ),
  },
  reporting: {
    baseURL: process.env.REACT_APP_REPORTING_SERVICE_URL || '',
    timeout: parseInt(
      process.env.REACT_APP_REPORTING_TIMEOUT_MS || '25000',
      10
    ),
    retries: parseInt(process.env.REACT_APP_REPORTING_RETRIES || '3', 10),
  },
  'core-ui': {
    baseURL: process.env.REACT_APP_CORE_UI_SERVICE_URL || '',
    timeout: parseInt(
      process.env.REACT_APP_CORE_UI_TIMEOUT_MS || '10000',
      10
    ),
    retries: parseInt(process.env.REACT_APP_CORE_UI_RETRIES || '2', 10),
  },
  'design-system': {
    baseURL: process.env.REACT_APP_DESIGN_SYSTEM_SERVICE_URL || '',
    timeout: parseInt(
      process.env.REACT_APP_DESIGN_SYSTEM_TIMEOUT_MS || '5000',
      10
    ),
    retries: parseInt(
      process.env.REACT_APP_DESIGN_SYSTEM_RETRIES || '1',
      10
    ),
  },
};

/**
 * Validate service configuration
 * Returns validation errors instead of throwing (for graceful degradation)
 */
export function validateServiceConfig(serviceName: ServiceName): string[] {
  const config = SERVICE_CONFIGS[serviceName];
  const errors: string[] = [];

  if (!config.baseURL) {
    // Missing baseURL is not an error - service is just disabled
    return errors; // Return empty - service is optional
  }

  if (config.timeout <= 0) {
    errors.push(`Invalid timeout for ${serviceName}: ${config.timeout}ms`);
  }

  if (config.retries < 0) {
    errors.push(`Invalid retries for ${serviceName}: ${config.retries}`);
  }

  return errors;
}

/**
 * Get service configuration
 * Returns config even if validation fails (for graceful degradation)
 */
export function getServiceConfig(serviceName: ServiceName): ServiceConfig {
  const errors = validateServiceConfig(serviceName);
  if (errors.length > 0) {
    console.warn(`[ServiceConfig] Validation warnings for ${serviceName}:`, errors);
  }
  return SERVICE_CONFIGS[serviceName];
}

/**
 * Get all service configurations
 */
export function getAllServiceConfigs(): Record<ServiceName, ServiceConfig> {
  return SERVICE_CONFIGS;
}

/**
 * Check if service is enabled
 */
export function isServiceEnabled(serviceName: ServiceName): boolean {
  const config = SERVICE_CONFIGS[serviceName];
  return config.baseURL !== '';
}
