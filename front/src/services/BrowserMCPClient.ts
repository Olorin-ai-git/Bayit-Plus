/**
 * Browser-compatible MCP Client
 * Communicates with MCP servers via HTTP/SSE transport
 */

export interface MCPTool {
  name: string;
  display_name?: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: any;
  }>;
  isError?: boolean;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  description?: string;
  capabilities: {
    tools?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
  };
}

export class BrowserMCPClient {
  private baseUrl: string;
  private serverInfo: MCPServerInfo | null = null;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];
  private isConnected: boolean = false;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize connection to MCP server
   */
  async initialize(): Promise<void> {
    try {
      // Initialize handshake
      const response = await fetch(`${this.baseUrl}/mcp/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: { listChanged: true },
            sampling: {}
          },
          clientInfo: {
            name: 'olorin-web-client',
            version: '1.0.0'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`MCP initialization failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.serverInfo = result.serverInfo;
      this.isConnected = true;

      // Load tools and resources
      await this.loadTools();
      await this.loadResources();

    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to initialize MCP client: ${error}`);
    }
  }

  /**
   * Load available tools from server
   */
  async loadTools(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/tools/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load tools: ${response.statusText}`);
      }

      const result = await response.json();
      this.tools = result.tools || [];
    } catch (error) {
      console.error('Failed to load tools:', error);
      this.tools = [];
    }
  }

  /**
   * Load available resources from server
   */
  async loadResources(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/resources/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load resources: ${response.statusText}`);
      }

      const result = await response.json();
      this.resources = result.resources || [];
    } catch (error) {
      console.error('Failed to load resources:', error);
      this.resources = [];
    }
  }

  /**
   * Call a tool with arguments
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.isConnected) {
      throw new Error('MCP client not initialized. Call initialize() first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: toolName,
          arguments: args
        })
      });

      if (!response.ok) {
        throw new Error(`Tool call failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Tool execution failed: ${error}`
        }],
        isError: true
      };
    }
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('MCP client not initialized. Call initialize() first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/mcp/resources/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uri })
      });

      if (!response.ok) {
        throw new Error(`Resource read failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to read resource: ${error}`);
    }
  }

  /**
   * Subscribe to resource changes (using Server-Sent Events)
   */
  subscribeToResourceChanges(callback: (event: any) => void): EventSource | null {
    if (!this.isConnected) {
      console.error('MCP client not initialized');
      return null;
    }

    try {
      const eventSource = new EventSource(`${this.baseUrl}/mcp/resources/subscribe`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Failed to parse SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
      };

      return eventSource;
    } catch (error) {
      console.error('Failed to subscribe to resource changes:', error);
      return null;
    }
  }

  /**
   * Get server information
   */
  getServerInfo(): MCPServerInfo | null {
    return this.serverInfo;
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Get available resources
   */
  getResources(): MCPResource[] {
    return this.resources;
  }

  /**
   * Check if client is connected
   */
  isInitialized(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.isConnected = false;
    this.serverInfo = null;
    this.tools = [];
    this.resources = [];
  }
}

// Create a singleton instance
export const browserMCPClient = new BrowserMCPClient(); 