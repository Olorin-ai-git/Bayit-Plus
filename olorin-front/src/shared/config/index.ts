/**
 * Configuration Module Exports
 *
 * Central configuration management following SYSTEM MANDATE compliance.
 * All configuration loaded from environment variables with fail-fast validation.
 */

export {
  loadConfig,
  getConfig,
  resetConfig,
  isFeatureEnabled,
  getApiUrl,
  getWsUrl
} from './AppConfig';

export type { AppConfig } from './AppConfig';
