/**
 * Agent Registry - Loads agents from ~/.claude/subagents.json
 *
 * Provides:
 * - List all agents
 * - Filter by category
 * - Search by name/description
 * - Load agent presets
 */

import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { resolveClaudeDir } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { Agent, AgentPreset, SubagentsConfig } from '../types/agent.js';

export class AgentRegistry {
  private config: SubagentsConfig | null = null;
  private claudeDir: string;

  constructor() {
    this.claudeDir = resolveClaudeDir();
  }

  /**
   * Load agents configuration from subagents.json
   */
  private loadConfig(): SubagentsConfig {
    if (this.config) {
      return this.config;
    }

    const configPath = join(this.claudeDir, 'subagents.json');

    if (!existsSync(configPath)) {
      throw new Error(`
❌ subagents.json not found at: ${configPath}

Expected location: ~/.claude/subagents.json

💡 Solution: Ensure .claude directory is properly set up
      `.trim());
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(content) as SubagentsConfig;

      logger.debug('Loaded subagents.json', {
        agentPath: this.config.agentPath,
        categoriesCount: Object.keys(this.config.subagents).length,
        presetsCount: Object.keys(this.config.presets).length,
      });

      return this.config;
    } catch (error) {
      throw new Error(`Failed to parse subagents.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    const config = this.loadConfig();
    const agents: Agent[] = [];

    for (const [category, categoryAgents] of Object.entries(config.subagents)) {
      for (const [name, agentData] of Object.entries(categoryAgents)) {
        agents.push({
          name,
          category,
          ...agentData,
        });
      }
    }

    return agents;
  }

  /**
   * Get agents by category
   */
  getAgentsByCategory(category: string): Agent[] {
    const config = this.loadConfig();
    const categoryAgents = config.subagents[category];

    if (!categoryAgents) {
      return [];
    }

    return Object.entries(categoryAgents).map(([name, agentData]) => ({
      name,
      category,
      ...agentData,
    }));
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const config = this.loadConfig();
    return Object.keys(config.subagents);
  }

  /**
   * Search agents by name or description
   */
  searchAgents(query: string): Agent[] {
    const allAgents = this.getAllAgents();
    const lowerQuery = query.toLowerCase();

    return allAgents.filter(agent =>
      agent.name.toLowerCase().includes(lowerQuery) ||
      agent.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get specific agent by name
   */
  getAgent(name: string): Agent | null {
    const allAgents = this.getAllAgents();
    return allAgents.find(agent => agent.name === name) || null;
  }

  /**
   * Get all presets
   */
  getPresets(): Record<string, AgentPreset> {
    const config = this.loadConfig();
    return config.presets;
  }

  /**
   * Get specific preset
   */
  getPreset(name: string): AgentPreset | null {
    const config = this.loadConfig();
    return config.presets[name] || null;
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.getAllAgents().length;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAgents: number;
    totalCategories: number;
    totalPresets: number;
    agentsPerCategory: Record<string, number>;
  } {
    const config = this.loadConfig();
    const agents = this.getAllAgents();

    const agentsPerCategory: Record<string, number> = {};
    for (const category of this.getCategories()) {
      agentsPerCategory[category] = this.getAgentsByCategory(category).length;
    }

    return {
      totalAgents: agents.length,
      totalCategories: Object.keys(config.subagents).length,
      totalPresets: Object.keys(config.presets).length,
      agentsPerCategory,
    };
  }
}
