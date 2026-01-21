/**
 * Environment Configuration
 * 
 * Environment variables and configuration settings for the analytics module.
 * 
 * @author Gil Klainert
 * @version 1.0.0
*/

export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  redisUrl?: string;
  enableCaching: boolean;
  cacheTimeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    tls?: any;
  };
  email?: {
    from?: string;
    service?: string;
  };
  search?: {
    apiKey?: string;
    endpoint?: string;
  };
}

const NODE_ENV = process.env.NODE_ENV || 'development';

export const environment: EnvironmentConfig = {
  isDevelopment: NODE_ENV === 'development',
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  redisUrl: process.env.REDIS_URL,
  enableCaching: process.env.ENABLE_CACHING !== 'false',
  cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300', 10), // 5 minutes default
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  },
  email: {
    from: process.env.EMAIL_FROM,
    service: process.env.EMAIL_SERVICE,
  },
  search: {
    apiKey: process.env.SEARCH_API_KEY,
    endpoint: process.env.SEARCH_ENDPOINT,
  },
};

export function getEnvironmentConfig(): EnvironmentConfig {
  return environment;
}

export default environment;