import {
  MCPClientState,
  OlorinTool,
  OlorinResource,
  OlorinPrompt,
  MCPRequest,
  MCPResponse,
  MCPError,
  ToolExecutionRequest,
  ToolExecutionResult
} from './mcpTypes';

export class MCPWebClient {
  private httpBaseUrl: string;
  private requestId = 1;

  constructor(baseUrl: string) {
    this.httpBaseUrl = baseUrl;
  }

  // Initialize connection
  async initialize(): Promise<void> {
    try {
      // Test connection to MCP server
      const response = await fetch(`${this.httpBaseUrl}/api/mcp/status`);
      if (!response.ok) {
        throw new Error('MCP Server not accessible');
      }
      
      console.log('✅ MCP Server connection established');
    } catch (error) {
      console.error('❌ Failed to connect to MCP Server:', error);
      throw error;
    }
  }

  // Send HTTP request to MCP server
  private async sendHttpRequest(method: string, params?: any): Promise<any> {
    try {
      const response = await fetch(`${this.httpBaseUrl}/api/mcp/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params || {})
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`MCP Request failed:`, error);
      throw error;
    }
  }

  // Get available tools
  async getTools(): Promise<OlorinTool[]> {
    try {
      const result = await this.sendHttpRequest('tools/list');
      return result.tools || [];
    } catch (error) {
      console.error('Failed to get tools:', error);
      return [];
    }
  }

  // Execute a tool
  async executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    try {
      const result = await this.sendHttpRequest('tools/call', {
        name: request.name,
        arguments: request.arguments
      });
      
      return {
        content: result.content || [{ type: "text", text: JSON.stringify(result) }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }],
        isError: true
      };
    }
  }

  // Get available resources
  async getResources(): Promise<OlorinResource[]> {
    try {
      const result = await this.sendHttpRequest('resources/list');
      return result.resources || [];
    } catch (error) {
      console.error('Failed to get resources:', error);
      return [];
    }
  }

  // Get resource content
  async getResource(uri: string): Promise<string> {
    try {
      const result = await this.sendHttpRequest('resources/read', { uri });
      return result.contents?.[0]?.text || '';
    } catch (error) {
      console.error('Failed to get resource:', error);
      throw error;
    }
  }

  // Get available prompts
  async getPrompts(): Promise<OlorinPrompt[]> {
    try {
      const result = await this.sendHttpRequest('prompts/list');
      return result.prompts || [];
    } catch (error) {
      console.error('Failed to get prompts:', error);
      return [];
    }
  }

  // Get prompt content
  async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
    try {
      const result = await this.sendHttpRequest('prompts/get', { 
        name, 
        arguments: args || {} 
      });
      return result;
    } catch (error) {
      console.error('Failed to get prompt:', error);
      throw error;
    }
  }
}

// Singleton instance
export const mcpClient = new MCPWebClient(
  process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:8000'
); 