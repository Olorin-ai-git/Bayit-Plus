/**
 * MCP (Model Context Protocol) Client for Frontend Integration
 * Connects to the Olorin MCP server to access LangChain tools
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  schema?: Record<string, any>;
  category?: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  description: string;
  tools_initialized: boolean;
  available_tools: number;
  enabled_categories: string[];
}

export class MCPClient {
  private baseUrl: string;
  private isConnected: boolean = false;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];

  constructor(baseUrl: string = 'http://localhost:8001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize connection and load available tools/resources
   */
  async connect(): Promise<void> {
    try {
      // Test connection
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`MCP server not available: ${response.status}`);
      }

      // Load tools and resources
      await Promise.all([
        this.loadTools(),
        this.loadResources()
      ]);

      this.isConnected = true;
      console.log(`MCP Client connected. Available tools: ${this.tools.length}`);
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  /**
   * Load available tools from MCP server
   */
  private async loadTools(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tools`);
      if (!response.ok) {
        throw new Error(`Failed to load tools: ${response.status}`);
      }

      this.tools = await response.json();
    } catch (error) {
      console.error('Failed to load tools:', error);
      this.tools = [];
    }
  }

  /**
   * Load available resources from MCP server
   */
  private async loadResources(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/resources`);
      if (!response.ok) {
        throw new Error(`Failed to load resources: ${response.status}`);
      }

      this.resources = await response.json();
    } catch (error) {
      console.error('Failed to load resources:', error);
      this.resources = [];
    }
  }

  /**
   * Get list of available tools
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): MCPTool[] {
    return this.tools.filter(tool => 
      tool.name.toLowerCase().includes(category.toLowerCase()) ||
      tool.description.toLowerCase().includes(category.toLowerCase())
    );
  }

  /**
   * Get Olorin-specific tools (Splunk, OII, etc.)
   */
  getOlorinTools(): MCPTool[] {
    return this.tools.filter(tool => 
      ['splunk', 'oii', 'di', 'identity'].some(keyword =>
        tool.name.toLowerCase().includes(keyword) ||
        tool.description.toLowerCase().includes(keyword)
      )
    );
  }

  /**
   * Call a tool with arguments
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.isConnected) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/tools/${toolName}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ arguments: args })
      });

      if (!response.ok) {
        throw new Error(`Tool call failed: ${response.status} ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to call tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('MCP client not connected. Call connect() first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/resources/${encodeURIComponent(uri)}`);
      if (!response.ok) {
        throw new Error(`Resource read failed: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`Failed to read resource ${uri}:`, error);
      throw error;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<MCPServerInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/info`);
      if (!response.ok) {
        throw new Error(`Failed to get server info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get server info:', error);
      throw error;
    }
  }

  /**
   * Search Splunk logs
   */
  async searchSplunk(query: string): Promise<any> {
    return this.callTool('splunk_query_tool', { query });
  }

  /**
   * Get user identity information
   */
  async getUserIdentity(userId: string): Promise<any> {
    return this.callTool('identity_info_tool', { user_id: userId });
  }



  /**
   * Perform web search
   */
  async webSearch(query: string, maxResults: number = 10): Promise<any> {
    return this.callTool('web_search', { query, max_results: maxResults });
  }

  /**
   * Scrape web page
   */
  async scrapePage(url: string): Promise<any> {
    return this.callTool('web_scrape', { url });
  }

  /**
   * Read file
   */
  async readFile(filePath: string): Promise<any> {
    return this.callTool('file_read', { file_path: filePath });
  }

  /**
   * List directory contents
   */
  async listDirectory(path: string): Promise<any> {
    return this.callTool('directory_list', { path });
  }

  /**
   * Make HTTP request
   */
  async httpRequest(url: string, method: string = 'GET', data?: any, headers?: Record<string, string>): Promise<any> {
    return this.callTool('http_request', { url, method, data, headers });
  }

  /**
   * Disconnect from MCP server
   */
  disconnect(): void {
    this.isConnected = false;
    this.tools = [];
    this.resources = [];
    console.log('MCP Client disconnected');
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const mcpClient = new MCPClient();
export default MCPClient; 