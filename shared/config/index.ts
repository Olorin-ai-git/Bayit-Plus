/**
 * Shared Config - Central Export File
 */

export {
  APP_MODE,
  isDemo,
  isProduction,
  config,
} from './appConfig';

export {
  getSentryConfig,
  isSensitiveKey,
  SENTRY_SENSITIVE_PATTERNS,
} from './sentryConfig';
export type { SentryConfig } from './sentryConfig';
