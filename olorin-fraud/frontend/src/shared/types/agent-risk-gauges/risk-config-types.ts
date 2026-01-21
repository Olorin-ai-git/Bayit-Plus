/**
 * Risk Configuration Types
 * Type definitions for risk thresholds, colors, and zones
 * Feature: 012-agents-risk-gauges
 */

/**
 * Risk threshold definitions
 */
export interface RiskThresholds {
  /** Low/Medium boundary (0-100) */
  low: number;

  /** Medium/High boundary (0-100) */
  medium: number;

  /** Maximum risk value (always 100) */
  high: number;

  /** Severe warning threshold for pulse animation (70-100) */
  pulse: number;
}

/**
 * Risk level colors (hex format)
 */
export interface RiskColors {
  /** Low risk color (default: green #34c759) */
  low: string;

  /** Medium risk color (default: orange #ff9f0a) */
  medium: string;

  /** High risk color (default: red #ff3b30) */
  high: string;
}

/**
 * User configuration for risk gauge visualization
 * Persisted in localStorage with key: olorin_agent_risk_gauges_config
 */
export interface RiskConfiguration {
  /** Configuration schema version for migrations */
  version: string;

  /** Risk threshold values */
  thresholds: RiskThresholds;

  /** Risk level color scheme */
  colors: RiskColors;

  /** Needle animation speed in milliseconds */
  animationSpeed: number;
}

/**
 * Risk zone for gauge visualization
 */
export interface RiskZone {
  /** Zone start value */
  start: number;

  /** Zone end value */
  end: number;

  /** Zone color (hex) */
  color: string;

  /** Zone label */
  label: 'LOW' | 'MED' | 'HIGH';
}
