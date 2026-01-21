/**
 * Sentry Configuration
 * Centralized Sentry DSN and settings for all platforms.
 *
 * The actual DSN should come from environment variables.
 * This file provides the configuration structure and defaults.
 */

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  enabled: boolean;
}

/**
 * Get Sentry configuration from environment variables.
 * Works across Web (Vite), React Native (process.env), and Node.js environments.
 */
export const getSentryConfig = (): SentryConfig => {
  // Try Vite environment variables first (web)
  const viteEnv = typeof import.meta !== 'undefined' && (import.meta as any).env;

  // Get DSN from appropriate environment variable
  const dsn =
    viteEnv?.VITE_SENTRY_DSN ||
    process.env.SENTRY_DSN ||
    process.env.VITE_SENTRY_DSN ||
    '';

  // Get environment
  const environment =
    viteEnv?.VITE_SENTRY_ENVIRONMENT ||
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VITE_SENTRY_ENVIRONMENT ||
    'development';

  // Get release version
  const release =
    viteEnv?.VITE_SENTRY_RELEASE ||
    process.env.SENTRY_RELEASE ||
    process.env.VITE_SENTRY_RELEASE ||
    undefined;

  // Get sample rates with defaults
  const tracesSampleRate = parseFloat(
    viteEnv?.VITE_SENTRY_TRACES_SAMPLE_RATE ||
    process.env.SENTRY_TRACES_SAMPLE_RATE ||
    '0.2'
  );

  return {
    dsn,
    environment,
    release,
    tracesSampleRate: isNaN(tracesSampleRate) ? 0.2 : tracesSampleRate,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enabled: !!dsn && dsn.length > 0,
  };
};

/**
 * Default Sentry sensitive data patterns to scrub before sending.
 * Used across all platforms for consistent privacy protection.
 */
export const SENTRY_SENSITIVE_PATTERNS = [
  'password',
  'token',
  'api_key',
  'apiKey',
  'secret',
  'authorization',
  'auth',
  'bearer',
  'jwt',
  'session',
  'cookie',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
] as const;

/**
 * Check if a key contains sensitive data that should be scrubbed.
 */
export const isSensitiveKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SENTRY_SENSITIVE_PATTERNS.some(pattern =>
    lowerKey.includes(pattern.toLowerCase())
  );
};

export default getSentryConfig;
