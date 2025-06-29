// MCP (Model Context Protocol) Types for Olorin

export interface MCPClientState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  tools: OlorinTool[];
  resources: OlorinResource[];
  prompts: OlorinPrompt[];
}

export interface MCPMessage {
  id: string;
  method: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export interface MCPRequest extends MCPMessage {
  method: string;
  params?: any;
}

export interface MCPResponse extends MCPMessage {
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// Olorin-specific Types
export interface OlorinTool {
  name: string;
  display_name?: string;
  description: string;
  inputSchema?: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface OlorinResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface OlorinPrompt {
  name: string;
  description: string;
  arguments: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

// Tool execution types
export interface ToolExecutionRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolExecutionResult {
  content: MCPContent[];
  isError: boolean;
}

// Chat message type (alias for compatibility)
export type ChatMessage = MCPChatMessage;

export interface MCPNotification {
  method: string;
  params?: any;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: any[];
  isError: boolean;
}

export interface MCPContent {
  type: string;
  text?: string;
  imageUrl?: string;
  toolCalls?: MCPToolCall[];
  toolResults?: MCPToolResult[];
}

export interface MCPChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: MCPContent[];
}

export interface MCPChatRequest {
  messages: MCPChatMessage[];
  model: string;
  tools?: OlorinTool[];
  stream?: boolean;
}

export interface MCPChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: MCPChatMessage;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MCPState {
  tools: OlorinTool[];
  resources: OlorinResource[];
  prompts: OlorinPrompt[];
} 