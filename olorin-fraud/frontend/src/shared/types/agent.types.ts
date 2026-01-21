/**
 * Agent Type Definitions
 * Feature: 004-new-olorin-frontend
 *
 * TypeScript interfaces for investigation agents with Olorin enterprise configuration.
 * Supports agent selection, tool compatibility, and configuration management.
 */

import { z } from 'zod';

/**
 * Agent names supported by the investigation system
 */
export enum AgentName {
  DEVICE_ANALYSIS = 'device_analysis',
  LOCATION_ANALYSIS = 'location_analysis',
  NETWORK_ANALYSIS = 'network_analysis',
  BEHAVIOR_ANALYSIS = 'behavior_analysis',
  LOGS_ANALYSIS = 'logs_analysis',
  RISK_ASSESSMENT = 'risk_assessment'
}

/**
 * Agent execution status
 */
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Tool priority levels
 */
export enum ToolPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Tool types in the investigation system
 */
export enum ToolType {
  OLORIN_TOOL = 'olorin_tool',
  EXTERNAL_TOOL = 'external_tool',
  MCP_TOOL = 'mcp_tool'
}

/**
 * Tool capability schema
 */
export const ToolCapabilitySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional()
});

/**
 * Enhanced investigation tool schema with Olorin enterprise metadata
 */
export const EnhancedToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  toolType: z.nativeEnum(ToolType),
  priority: z.nativeEnum(ToolPriority).default(ToolPriority.MEDIUM),
  enabled: z.boolean().default(false),
  icon: z.string().optional(),
  capabilities: z.array(ToolCapabilitySchema).optional(),
  agentCompatibility: z.array(z.nativeEnum(AgentName)).optional(),
  executionTimeEstimateMs: z.number().int().positive().optional(),
  requiresConfiguration: z.boolean().default(false),
  configurationSchema: z.record(z.unknown()).optional()
});

/**
 * Agent configuration schema
 */
export const AgentConfigSchema = z.object({
  name: z.nativeEnum(AgentName),
  displayName: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional(),
  enabled: z.boolean().default(false),
  compatibleTools: z.array(z.string()).default([]),
  recommendedTools: z.array(z.string()).default([]),
  executionOrder: z.number().int().nonnegative().default(0)
});

/**
 * Agent tools configuration (for settings page)
 */
export const AgentToolsConfigSchema = z.object({
  selectedAgent: z.nativeEnum(AgentName).nullable(),
  agents: z.array(AgentConfigSchema),
  tools: z.array(EnhancedToolSchema),
  selectedTools: z.array(z.string()).default([])
});

// TypeScript types derived from schemas
export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;
export type EnhancedTool = z.infer<typeof EnhancedToolSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentToolsConfig = z.infer<typeof AgentToolsConfigSchema>;

/**
 * Helper function to get agent display name
 * @param agentName - Agent name enum value
 * @returns User-friendly display name
 */
export function getAgentDisplayName(agentName: AgentName): string {
  const displayNames: Record<AgentName, string> = {
    [AgentName.DEVICE_ANALYSIS]: 'Device Analysis',
    [AgentName.LOCATION_ANALYSIS]: 'Location Analysis',
    [AgentName.NETWORK_ANALYSIS]: 'Network Analysis',
    [AgentName.BEHAVIOR_ANALYSIS]: 'Behavior Analysis',
    [AgentName.LOGS_ANALYSIS]: 'Logs Analysis',
    [AgentName.RISK_ASSESSMENT]: 'Risk Assessment'
  };
  return displayNames[agentName];
}

/**
 * Helper function to get agent icon
 * @param agentName - Agent name enum value
 * @returns Unicode emoji icon
 */
export function getAgentIcon(agentName: AgentName): string {
  const icons: Record<AgentName, string> = {
    [AgentName.DEVICE_ANALYSIS]: '📱',
    [AgentName.LOCATION_ANALYSIS]: '🌍',
    [AgentName.NETWORK_ANALYSIS]: '🕸️',
    [AgentName.BEHAVIOR_ANALYSIS]: '👤',
    [AgentName.LOGS_ANALYSIS]: '📋',
    [AgentName.RISK_ASSESSMENT]: '⚠️'
  };
  return icons[agentName];
}

/**
 * Helper function to get tool type label
 * @param toolType - Tool type enum value
 * @returns User-friendly label
 */
export function getToolTypeLabel(toolType: ToolType): string {
  const labels: Record<ToolType, string> = {
    [ToolType.OLORIN_TOOL]: 'OLORIN',
    [ToolType.EXTERNAL_TOOL]: 'External',
    [ToolType.MCP_TOOL]: 'MCP'
  };
  return labels[toolType];
}

/**
 * Helper function to categorize tools by type
 * @param tools - Array of enhanced tools
 * @returns Tools grouped by tool type
 */
export function groupToolsByType(
  tools: EnhancedTool[]
): Record<ToolType, EnhancedTool[]> {
  return tools.reduce((acc, tool) => {
    if (!acc[tool.toolType]) {
      acc[tool.toolType] = [];
    }
    acc[tool.toolType].push(tool);
    return acc;
  }, {} as Record<ToolType, EnhancedTool[]>);
}

/**
 * Helper function to filter tools compatible with an agent
 * @param tools - Array of enhanced tools
 * @param agentName - Agent name to filter by
 * @returns Tools compatible with the specified agent
 */
export function getCompatibleTools(
  tools: EnhancedTool[],
  agentName: AgentName
): EnhancedTool[] {
  return tools.filter(
    (tool) =>
      !tool.agentCompatibility ||
      tool.agentCompatibility.length === 0 ||
      tool.agentCompatibility.includes(agentName)
  );
}

/**
 * Helper function to get recommended tools for an agent
 * @param agent - Agent configuration
 * @param availableTools - Array of available tools
 * @returns Tool names recommended for the agent
 */
export function getRecommendedToolsForAgent(
  agent: AgentConfig,
  availableTools: EnhancedTool[]
): string[] {
  return agent.recommendedTools.filter((toolName) =>
    availableTools.some((tool) => tool.name === toolName)
  );
}
