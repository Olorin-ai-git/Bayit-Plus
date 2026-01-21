/**
 * Environment configuration for the Unified Module Requirements System
 */

export interface EnvironmentConfig {
  // Server configuration
  port: number;
  host: string;
  environment: 'development' | 'production' | 'test';

  // API configuration
  apiVersion: string;
  enableCors: boolean;
  corsOrigins: string[];

  // Rate limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // Validation configuration
  maxConcurrentValidations: number;
  validationTimeoutMs: number;
  enableStrictMode: boolean;

  // Build configuration
  enableParallelBuilds: boolean;
  buildTimeoutMs: number;

  // Logging configuration
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableRequestLogging: boolean;

  // Security configuration
  enableHelmet: boolean;
  trustProxy: boolean;

  // Cache configuration
  enableCache: boolean;
  cacheTimeoutMs: number;
}

const defaultConfig: EnvironmentConfig = {
  // Server defaults
  port: 3001,
  host: '0.0.0.0',
  environment: 'development',

  // API defaults
  apiVersion: 'v1',
  enableCors: true,
  corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],

  // Rate limiting defaults
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100,

  // Validation defaults
  maxConcurrentValidations: 5,
  validationTimeoutMs: 300000, // 5 minutes
  enableStrictMode: false,

  // Build defaults
  enableParallelBuilds: true,
  buildTimeoutMs: 600000, // 10 minutes

  // Logging defaults
  logLevel: 'info',
  enableRequestLogging: true,

  // Security defaults
  enableHelmet: true,
  trustProxy: false,

  // Cache defaults
  enableCache: true,
  cacheTimeoutMs: 3600000 // 1 hour
};

function getEnvironmentValue<T>(key: string, defaultValue: T, parser?: (value: string) => T): T {
  const envValue = process.env[key];
  if (!envValue) {
    return defaultValue;
  }

  if (parser) {
    try {
      return parser(envValue);
    } catch {
      return defaultValue;
    }
  }

  return envValue as unknown as T;
}

function parseNumber(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
}

function parseBoolean(value: string): boolean {
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function parseStringArray(value: string): string[] {
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    // Server configuration
    port: getEnvironmentValue('UMR_PORT', defaultConfig.port, parseNumber),
    host: getEnvironmentValue('UMR_HOST', defaultConfig.host),
    environment: getEnvironmentValue('UMR_ENVIRONMENT', defaultConfig.environment) as EnvironmentConfig['environment'],

    // API configuration
    apiVersion: getEnvironmentValue('UMR_API_VERSION', defaultConfig.apiVersion),
    enableCors: getEnvironmentValue('UMR_ENABLE_CORS', defaultConfig.enableCors, parseBoolean),
    corsOrigins: getEnvironmentValue('UMR_CORS_ORIGINS', defaultConfig.corsOrigins, parseStringArray),

    // Rate limiting
    rateLimitWindowMs: getEnvironmentValue('UMR_RATE_LIMIT_WINDOW_MS', defaultConfig.rateLimitWindowMs, parseNumber),
    rateLimitMaxRequests: getEnvironmentValue('UMR_RATE_LIMIT_MAX_REQUESTS', defaultConfig.rateLimitMaxRequests, parseNumber),

    // Validation configuration
    maxConcurrentValidations: getEnvironmentValue('UMR_MAX_CONCURRENT_VALIDATIONS', defaultConfig.maxConcurrentValidations, parseNumber),
    validationTimeoutMs: getEnvironmentValue('UMR_VALIDATION_TIMEOUT_MS', defaultConfig.validationTimeoutMs, parseNumber),
    enableStrictMode: getEnvironmentValue('UMR_ENABLE_STRICT_MODE', defaultConfig.enableStrictMode, parseBoolean),

    // Build configuration
    enableParallelBuilds: getEnvironmentValue('UMR_ENABLE_PARALLEL_BUILDS', defaultConfig.enableParallelBuilds, parseBoolean),
    buildTimeoutMs: getEnvironmentValue('UMR_BUILD_TIMEOUT_MS', defaultConfig.buildTimeoutMs, parseNumber),

    // Logging configuration
    logLevel: getEnvironmentValue('UMR_LOG_LEVEL', defaultConfig.logLevel) as EnvironmentConfig['logLevel'],
    enableRequestLogging: getEnvironmentValue('UMR_ENABLE_REQUEST_LOGGING', defaultConfig.enableRequestLogging, parseBoolean),

    // Security configuration
    enableHelmet: getEnvironmentValue('UMR_ENABLE_HELMET', defaultConfig.enableHelmet, parseBoolean),
    trustProxy: getEnvironmentValue('UMR_TRUST_PROXY', defaultConfig.trustProxy, parseBoolean),

    // Cache configuration
    enableCache: getEnvironmentValue('UMR_ENABLE_CACHE', defaultConfig.enableCache, parseBoolean),
    cacheTimeoutMs: getEnvironmentValue('UMR_CACHE_TIMEOUT_MS', defaultConfig.cacheTimeoutMs, parseNumber)
  };
}

// Global configuration instance
export const config = loadEnvironmentConfig();

// Environment type guards
export const isDevelopment = () => config.environment === 'development';
export const isProduction = () => config.environment === 'production';
export const isTest = () => config.environment === 'test';