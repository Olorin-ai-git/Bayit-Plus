/**
 * Command Registry - Loads commands from ~/.claude/commands.json
 *
 * CRITICAL: Commands.json references EXECUTABLE SCRIPTS, not Markdown files
 * Markdown files (.md) are DOCUMENTATION ONLY
 *
 * Provides:
 * - List all commands
 * - Search commands
 * - Execute commands via scripts
 */

import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { resolveClaudeDir } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { CommandManifest, CommandsConfig } from '../types/command.js';

export class CommandRegistry {
  private config: CommandsConfig | null = null;
  private claudeDir: string;

  constructor() {
    this.claudeDir = resolveClaudeDir();
  }

  /**
   * Load commands configuration from commands.json
   */
  private loadConfig(): CommandsConfig {
    if (this.config) {
      return this.config;
    }

    const configPath = join(this.claudeDir, 'commands.json');

    if (!existsSync(configPath)) {
      throw new Error(`
❌ commands.json not found at: ${configPath}

Expected location: ~/.claude/commands.json

💡 Solution: Ensure .claude directory is properly set up
      `.trim());
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(content) as CommandsConfig;

      logger.debug('Loaded commands.json', {
        commandsCount: Object.keys(this.config.commands).length,
      });

      return this.config;
    } catch (error) {
      throw new Error(`Failed to parse commands.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all commands
   */
  getAllCommands(): CommandManifest[] {
    const config = this.loadConfig();
    const commands: CommandManifest[] = [];

    for (const [name, commandData] of Object.entries(config.commands)) {
      commands.push({
        name,
        ...commandData,
      });
    }

    return commands;
  }

  /**
   * Search commands by name or description
   */
  searchCommands(query: string): CommandManifest[] {
    const allCommands = this.getAllCommands();
    const lowerQuery = query.toLowerCase();

    return allCommands.filter(command =>
      command.name.toLowerCase().includes(lowerQuery) ||
      command.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get specific command by name
   */
  getCommand(name: string): CommandManifest | null {
    const config = this.loadConfig();
    const commandData = config.commands[name];

    if (!commandData) {
      return null;
    }

    return {
      name,
      ...commandData,
    };
  }

  /**
   * Get commands for specific platform
   */
  getCommandsByPlatform(platform: string): CommandManifest[] {
    const allCommands = this.getAllCommands();

    return allCommands.filter(command => {
      if (!command.platform) {
        return true; // No platform restriction
      }
      return command.platform.includes(platform);
    });
  }

  /**
   * Get command count
   */
  getCommandCount(): number {
    return this.getAllCommands().length;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalCommands: number;
    commandsWithDocs: number;
    platformSpecific: number;
  } {
    const commands = this.getAllCommands();

    return {
      totalCommands: commands.length,
      commandsWithDocs: commands.filter(c => c.documentation).length,
      platformSpecific: commands.filter(c => c.platform && c.platform.length > 0).length,
    };
  }
}
