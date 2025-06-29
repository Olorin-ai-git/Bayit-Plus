export interface Sandbox {
  env?: string;
  logger?: {
    log: (message: string) => void;
    error: (message: string) => void;
  };
  pluginConfig?: {
    extendedProperties?: {
      API_KEY?: string;
    };
  };
  on?: (event: string, handler: (data: any) => void) => void;
  off?: (event: string, handler: (data: any) => void) => void;
  send?: (event: string, data: any) => void;
}

export interface RestClientConfig {
  baseUrl: string;
  apiKey?: string;
  authType?: string;
  onRequestStart?: any;
  onRequestEnd?: any;
  noRetry?: boolean;
}

export type StaticRestClientConfig = Omit<RestClientConfig, 'sandbox'>;

/**
 * Environment configuration for different services.
 */
type Service = 'olorin';

type Environment = 'e2e' | 'qal' | 'prod' | 'local';

interface ServiceConfig {
  baseUrl: string;
}

// Check if running locally
const isLocalDevelopment = () => {
  // Check for environment variable override first
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
    return false; // Use the environment variable instead
  }
  
  // Check if we're running on localhost
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  }
  return false;
};

// Get the base URL from environment variable or default config
const getBaseUrl = (defaultUrl: string): string => {
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return defaultUrl;
};

const ENV_CONFIG: Record<Environment, Record<Service, ServiceConfig>> = {
  local: {
    olorin: {
      baseUrl: getBaseUrl('http://localhost:8090'),
    },
  },
  e2e: {
    olorin: {
      baseUrl: getBaseUrl('https://olorin-e2e.api.intuit.com'),
    },
  },
  qal: {
    olorin: {
      baseUrl: getBaseUrl('https://olorin-qal.api.intuit.com'),
    },
  },
  prod: {
    olorin: {
      baseUrl: getBaseUrl('https://olorin-e2e.api.intuit.com'),
    },
  },
};

/**
 * Get environment configuration for a service.
 * @param {Sandbox} sandbox - The web-shell sandbox.
 * @param {Service} service - The service name.
 * @returns {ServiceConfig} The service configuration.
 */
export const getEnvConfig = (sandbox: Sandbox, service: Service): ServiceConfig => {
  // If running locally, always use local config
  if (isLocalDevelopment()) {
    return ENV_CONFIG.local[service];
  }
  
  const env = sandbox.env || 'e2e';
  return ENV_CONFIG[env as Environment]?.[service] || ENV_CONFIG.e2e[service];
};

/**
 * get environment config data
 * @param {string} environment : environment
 * @returns {RestClientConfig} envConfig
 */
const getEnvConfigData = (
  environment: string,
): Record<Service, StaticRestClientConfig> => {
  // If running locally, always return local config
  if (isLocalDevelopment() && environment !== 'local') {
    return ENV_CONFIG.local;
  }
  return ENV_CONFIG[environment as Environment];
};

export { getEnvConfigData };
