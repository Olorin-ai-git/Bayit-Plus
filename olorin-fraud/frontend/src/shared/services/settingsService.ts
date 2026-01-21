/**
 * Settings Service
 * Feature: 004-new-olorin-frontend
 *
 * Fetches agents and tools configuration from backend API.
 * SYSTEM MANDATE compliant: No hardcoded values, configuration-driven.
 */

import { BaseApiService } from './BaseApiService';
import { getRuntimeConfig } from '../config/runtimeConfig';

export interface ToolDisplayInfo {
  name: string;
  display_name: string;
  category: string;
  description?: string;
}

export interface ToolsByCategory {
  olorin_tools: ToolDisplayInfo[];
  mcp_tools: ToolDisplayInfo[];
}

export interface AgentToolsMapping {
  [agentName: string]: string[];
}

/**
 * Settings Service for fetching agents and tools from backend
 */
export class SettingsService extends BaseApiService {
  private readonly settingsEndpoint = '/api/settings';

  constructor(baseUrl?: string) {
    const apiUrl = baseUrl || getRuntimeConfig('REACT_APP_API_BASE_URL', { fallback: 'http://localhost:8090', required: false });
    super(apiUrl);
  }

  /**
   * Get list of available agents
   */
  async getAgents(): Promise<string[]> {
    return this.get<string[]>(`${this.settingsEndpoint}/agents`);
  }

  /**
   * Get list of available tools
   */
  async getTools(): Promise<string[]> {
    return this.get<string[]>(`${this.settingsEndpoint}/tools`);
  }

  /**
   * Get tools with display names and descriptions
   */
  async getToolsWithDisplayNames(): Promise<ToolDisplayInfo[]> {
    return this.get<ToolDisplayInfo[]>(`${this.settingsEndpoint}/tools-with-display-names`);
  }

  /**
   * Get tools organized by category (Olorin vs MCP tools)
   */
  async getToolsByCategory(): Promise<ToolsByCategory> {
    return this.get<ToolsByCategory>(`${this.settingsEndpoint}/tools-by-category`);
  }

  /**
   * Get mapping of agents to their available tools
   */
  async getAgentToolsMapping(): Promise<AgentToolsMapping> {
    return this.get<AgentToolsMapping>(`${this.settingsEndpoint}/agent-tools-mapping`);
  }
}

// Singleton instance
export const settingsService = new SettingsService();
