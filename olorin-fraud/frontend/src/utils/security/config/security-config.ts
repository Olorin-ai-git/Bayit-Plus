/**
 * Security Configuration
 * Configuration-driven security settings from environment variables
 * Feature: Client-side security controls
 *
 * SYSTEM MANDATE: All configuration values from process.env
 * NO hardcoded values allowed
 */

import type { SecurityConfig } from '../types/security-types';

/**
 * Load security configuration from environment variables
 * All values come from process.env - NO hardcoded defaults
 */
export function loadSecurityConfig(): SecurityConfig {
  // Parse allowed domains from comma-separated string
  const allowedDomainsString = process.env.REACT_APP_SECURITY_ALLOWED_DOMAINS || '';
  const allowedDomains = allowedDomainsString
    .split(',')
    .map(domain => domain.trim())
    .filter(domain => domain.length > 0);

  return {
    enableXSSProtection: process.env.REACT_APP_SECURITY_ENABLE_XSS === 'true',
    enableCSRFProtection: process.env.REACT_APP_SECURITY_ENABLE_CSRF === 'true',
    enableInputValidation: process.env.REACT_APP_SECURITY_ENABLE_INPUT_VALIDATION === 'true',
    maxInputLength: parseInt(
      process.env.REACT_APP_SECURITY_MAX_INPUT_LENGTH || '0',
      10
    ),
    allowedDomains,
    sessionTimeoutMinutes: parseInt(
      process.env.REACT_APP_SECURITY_SESSION_TIMEOUT_MINUTES || '0',
      10
    ),
    enableSecurityHeaders: process.env.REACT_APP_SECURITY_ENABLE_HEADERS === 'true',
  };
}

/**
 * Validate security configuration
 * Throws error if required configuration is missing
 */
export function validateSecurityConfig(config: SecurityConfig): void {
  const errors: string[] = [];

  if (config.maxInputLength <= 0) {
    errors.push('REACT_APP_SECURITY_MAX_INPUT_LENGTH must be > 0');
  }

  if (config.sessionTimeoutMinutes <= 0) {
    errors.push('REACT_APP_SECURITY_SESSION_TIMEOUT_MINUTES must be > 0');
  }

  if (config.allowedDomains.length === 0) {
    errors.push('REACT_APP_SECURITY_ALLOWED_DOMAINS must contain at least one domain');
  }

  if (errors.length > 0) {
    throw new Error(
      `Security configuration invalid:\n${errors.join('\n')}`
    );
  }
}

/**
 * Get validated security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  const config = loadSecurityConfig();
  validateSecurityConfig(config);
  return config;
}

// Singleton configuration instance
let cachedConfig: SecurityConfig | null = null;

/**
 * Get cached security configuration (loads once)
 */
export function getCachedSecurityConfig(): SecurityConfig {
  if (!cachedConfig) {
    cachedConfig = getSecurityConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached configuration (for testing)
 */
export function resetSecurityConfig(): void {
  cachedConfig = null;
}
