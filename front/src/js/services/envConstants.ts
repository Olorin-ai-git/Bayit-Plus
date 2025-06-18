// Environment constants without AppFabric dependencies

export interface EnvConfig {
  baseUrl: string;
  timeout?: number;
  apiVersion?: string;
}

/**
 * Get environment configuration for a service
 * @param context - Not used in standalone version
 * @param serviceName - Name of the service
 * @returns Environment configuration
 */
export function getEnvConfig(context: any, serviceName: string): EnvConfig {
  // Default configuration - can be overridden by environment variables
  const defaultConfig: EnvConfig = {
    baseUrl: process.env.REACT_APP_OLORIN_API_URL || 'http://localhost:8000',
    timeout: 30000,
    apiVersion: 'v1',
  };

  // You can add environment-specific logic here
  const environment = process.env.NODE_ENV || 'development';
  
  switch (environment) {
    case 'production':
      return {
        ...defaultConfig,
        baseUrl: process.env.REACT_APP_OLORIN_API_URL || 'https://api.olorin.com',
      };
    case 'staging':
      return {
        ...defaultConfig,
        baseUrl: process.env.REACT_APP_OLORIN_API_URL || 'https://staging-api.olorin.com',
      };
    default:
      return defaultConfig;
  }
}

export default getEnvConfig;
