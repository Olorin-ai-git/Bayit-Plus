/**
 * MCP Client - Model Context Protocol client for Olorin CLI
 *
 * Provides connectivity to MCP servers for tool discovery and execution.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

export interface ServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface McpConfig {
  mcpServers: Record<string, ServerConfig>;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: any;
}

/**
 * Olorin MCP Client for interacting with MCP servers
 */
export class OlorinMcpClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private connected = false;

  constructor() {
    this.client = new Client({
      name: 'olorin-cli',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
  }

  /**
   * Connect to an MCP server by name
   */
  async connect(serverName: string): Promise<void> {
    if (this.connected) {
      throw new Error('Client already connected. Disconnect first.');
    }

    logger.debug('Loading MCP configuration', { serverName });
    const config = await this.loadMcpConfig(serverName);

    logger.debug('Creating transport', { command: config.command, args: config.args });
    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env
    });

    logger.debug('Connecting to MCP server');
    await this.client.connect(this.transport);
    this.connected = true;

    logger.info('Connected to MCP server', { serverName });
  }

  /**
   * Disconnect from the current MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    logger.debug('Disconnecting from MCP server');
    await this.client.close();
    this.connected = false;
    this.transport = null;

    logger.info('Disconnected from MCP server');
  }

  /**
   * List available tools from the connected server
   */
  async listTools(): Promise<Tool[]> {
    this.ensureConnected();

    logger.debug('Listing tools from MCP server');
    const response = await this.client.listTools();

    return response.tools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  /**
   * Call a tool on the connected MCP server
   */
  async callTool(name: string, args: any): Promise<any> {
    this.ensureConnected();

    logger.debug('Calling MCP tool', { tool: name, args });
    const response = await this.client.callTool({
      name,
      arguments: args
    });

    logger.debug('Tool call response', { content: response.content });
    return response.content;
  }

  /**
   * Load MCP configuration from file
   */
  private async loadMcpConfig(serverName: string): Promise<ServerConfig> {
    const configPath = this.resolveMcpConfigPath();

    logger.debug('Loading MCP config', { configPath });

    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const config: McpConfig = JSON.parse(configData);

      if (!config.mcpServers || !config.mcpServers[serverName]) {
        throw new Error(`MCP server "${serverName}" not found in configuration`);
      }

      return config.mcpServers[serverName];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(
          `MCP configuration file not found at: ${configPath}\n` +
          'Create a .mcp.json file with your MCP server configurations.'
        );
      }
      throw error;
    }
  }

  /**
   * Resolve MCP configuration file path
   * Priority: OLORIN_MCP_CONFIG > .mcp.json (cwd) > ~/.mcp.json
   */
  private resolveMcpConfigPath(): string {
    if (process.env.OLORIN_MCP_CONFIG) {
      return process.env.OLORIN_MCP_CONFIG;
    }

    // Prefer current directory config, fallback to home directory
    return join(process.cwd(), '.mcp.json');
  }

  /**
   * Ensure client is connected before operations
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Not connected to MCP server. Call connect() first.');
    }
  }
}

/**
 * Helper function to load MCP configuration for listing servers
 */
export async function loadMcpConfig(): Promise<McpConfig> {
  const configPath = process.env.OLORIN_MCP_CONFIG ||
    join(process.cwd(), '.mcp.json') ||
    join(homedir(), '.mcp.json');

  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `MCP configuration file not found at: ${configPath}\n` +
        'Create a .mcp.json file with your MCP server configurations.'
      );
    }
    throw error;
  }
}
