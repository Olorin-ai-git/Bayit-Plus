/**
 * Configuration Schema & Validation
 * Configuration validation, persistence, and migration utilities
 * Feature: 012-agents-risk-gauges
 */

import type { RiskConfiguration } from './risk-config-types';

/**
 * Validate RiskConfiguration manually (Zod removed for build compatibility)
 */
export function validateRiskConfig(config: any): config is RiskConfiguration {
  if (!config || typeof config !== 'object') return false;
  if (config.version !== '1.0.0') return false;

  // Validate thresholds
  if (!config.thresholds || typeof config.thresholds !== 'object') return false;
  const t = config.thresholds;
  if (typeof t.low !== 'number' || t.low < 0 || t.low > 60) return false;
  if (typeof t.medium !== 'number' || t.medium < 40 || t.medium > 100)
    return false;
  if (typeof t.high !== 'number' || t.high !== 100) return false;
  if (typeof t.pulse !== 'number' || t.pulse < 70 || t.pulse > 100)
    return false;
  if (t.low >= t.medium || t.medium >= t.high) return false;

  // Validate colors
  if (!config.colors || typeof config.colors !== 'object') return false;
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!hexRegex.test(config.colors.low)) return false;
  if (!hexRegex.test(config.colors.medium)) return false;
  if (!hexRegex.test(config.colors.high)) return false;

  // Validate animation speed
  if (typeof config.animationSpeed !== 'number') return false;
  if (config.animationSpeed < 300 || config.animationSpeed > 2000)
    return false;

  return true;
}

/**
 * Default configuration (v1.0.0)
 */
export const DEFAULT_RISK_CONFIG: RiskConfiguration = {
  version: '1.0.0',
  thresholds: {
    low: 33,
    medium: 66,
    high: 100,
    pulse: 90,
  },
  colors: {
    low: '#34c759', // Green
    medium: '#ff9f0a', // Orange
    high: '#ff3b30', // Red
  },
  animationSpeed: 900, // 900ms spring animation
};

/**
 * Load configuration from localStorage
 */
export function loadConfig(): RiskConfiguration {
  try {
    const stored = localStorage.getItem('olorin_agent_risk_gauges_config');
    if (!stored) return DEFAULT_RISK_CONFIG;

    const parsed = JSON.parse(stored);

    // Version migration (future-proof)
    if (parsed.version !== '1.0.0') {
      return migrateConfig(parsed);
    }

    // Validate configuration
    if (validateRiskConfig(parsed)) {
      return parsed;
    } else {
      return DEFAULT_RISK_CONFIG;
    }
  } catch (error) {
    return DEFAULT_RISK_CONFIG;
  }
}

/**
 * Save configuration to localStorage (debounced in component)
 */
export function saveConfig(config: RiskConfiguration): void {
  try {
    localStorage.setItem(
      'olorin_agent_risk_gauges_config',
      JSON.stringify(config)
    );
  } catch (error) {
    // Silent fail - localStorage may not be available
  }
}

/**
 * Migrate configuration from older versions
 */
export function migrateConfig(old: any): RiskConfiguration {
  if (old.version === '1.0.0') {
    return old as RiskConfiguration;
  }

  // Unknown version, use defaults
  return DEFAULT_RISK_CONFIG;
}
