/**
 * Validation Utilities
 * Type guards and validation functions
 * Feature: 012-agents-risk-gauges
 */

import type { InvestigationStatus } from './ekg-monitor-types';
import type { AgentStatus, AgentType } from './agent-types';

/**
 * Type guard for investigation status
 */
export function isValidInvestigationStatus(
  status: string
): status is InvestigationStatus {
  return ['initializing', 'active', 'complete', 'failed'].includes(status);
}

/**
 * Type guard for agent status
 */
export function isValidAgentStatus(status: string): status is AgentStatus {
  return ['pending', 'running', 'completed', 'failed'].includes(status);
}

/**
 * Type guard for agent type
 */
export function isValidAgentType(type: string): type is AgentType {
  return ['Device', 'Location', 'Logs', 'Network', 'Risk', 'Labels'].includes(
    type
  );
}

/**
 * Validate risk score range
 */
export function isValidRiskScore(score: number): boolean {
  return Number.isFinite(score) && score >= 0 && score <= 100;
}

/**
 * Validate tools count range
 */
export function isValidToolsCount(count: number): boolean {
  return Number.isInteger(count) && count >= 0 && count <= 40;
}

/**
 * Validate hex color string
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate timestamp (within last 5 seconds)
 */
export function isValidTimestamp(timestamp: number): boolean {
  const now = Date.now();
  return (
    Number.isInteger(timestamp) &&
    timestamp <= now &&
    timestamp >= now - 5000
  );
}
