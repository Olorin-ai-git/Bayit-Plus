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

type Environment = 'e2e' | 'qal' | 'prod';

interface ServiceConfig {
  baseUrl: string;
}

const ENV_CONFIG: Record<Environment, Record<Service, ServiceConfig>> = {
  e2e: {
    olorin: {
      baseUrl: 'https://olorin-e2e.api.intuit.com',
    },
  },
  qal: {
    olorin: {
      baseUrl: 'https://olorin-qal.api.intuit.com',
    },
  },
  prod: {
    olorin: {
      baseUrl: 'https://olorin-e2e.api.intuit.com',
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
): Record<Service, StaticRestClientConfig> => ENV_CONFIG[environment as Environment];

export { getEnvConfigData };
