/**
 * Type definitions for Claude agents
 */

export interface Agent {
  name: string;
  category: string;
  description: string;
  tools?: string[];
  when?: string;
  markdownPath?: string;
  subagentType?: string;
}

export interface AgentPreset {
  name: string;
  description: string;
  agents: string[];
}

export interface AgentData {
  description: string;
  tools?: string[];
  when?: string;
  markdownPath?: string;
  subagentType?: string;
}

export interface SubagentsConfig {
  agentPath: string;
  subagents: Record<string, Record<string, AgentData>>;
  presets: Record<string, AgentPreset>;
}
