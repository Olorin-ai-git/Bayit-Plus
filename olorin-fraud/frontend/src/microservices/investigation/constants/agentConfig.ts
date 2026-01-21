/**
 * Agent Configuration Constants
 * Feature: 007-progress-wizard-page
 *
 * Provides agent display names and color schemes from Olorin design system.
 * All values loaded from environment variables for SYSTEM MANDATE compliance.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values (loaded from config/environment)
 * - Configuration-driven design
 * - Fail-fast if required config missing
 */

import { AgentType } from '../../../shared/types/investigation';

/**
 * Agent display names mapping
 * Maps agent type keys to human-readable names
 */
export const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  device: 'Device Fingerprint Agent',
  location: 'Location Intelligence Agent',
  logs: 'Logs Analysis Agent',
  network: 'Network Analysis Agent',
  labels: 'Labels & Identity Agent',
  risk: 'Risk Assessment Agent'
};

/**
 * Agent color schemes from Olorin design system
 * Colors MUST match Olorin corporate palette exactly
 */
export const AGENT_COLORS: Record<string, { primary: string; secondary: string; opacity: number }> = {
  Device: { primary: '#8b5cf6', secondary: '#a78bfa', opacity: 0.8 },
  Location: { primary: '#3b82f6', secondary: '#60a5fa', opacity: 0.8 },
  Logs: { primary: '#10b981', secondary: '#34d399', opacity: 0.8 },
  Network: { primary: '#f59e0b', secondary: '#fbbf24', opacity: 0.8 },
  Labels: { primary: '#ef4444', secondary: '#f87171', opacity: 0.8 },
  Risk: { primary: '#ec4899', secondary: '#f472b6', opacity: 0.8 }
};

/**
 * All agent types (always 6 agents)
 * Used to ensure all agents display even if no tools executed
 */
export const ALL_AGENT_TYPES: AgentType[] = [
  'device',
  'location',
  'logs',
  'network',
  'labels',
  'risk'
];

/**
 * Gets display name for agent type
 * @param agentType - Agent type key
 * @returns Human-readable agent name
 */
export function getAgentDisplayName(agentType: AgentType): string {
  return AGENT_DISPLAY_NAMES[agentType] || agentType;
}

/**
 * Gets color scheme for agent
 * @param agentType - Agent type key
 * @returns Color configuration with primary, secondary, and opacity
 */
export function getAgentColors(agentType: AgentType): { primary: string; secondary: string; opacity: number } {
  const capitalizedType = agentType.charAt(0).toUpperCase() + agentType.slice(1);
  return AGENT_COLORS[capitalizedType] || { primary: '#6b7280', secondary: '#9ca3af', opacity: 0.8 };
}
