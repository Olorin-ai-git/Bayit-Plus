import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { OlorinTool, OlorinResource, OlorinPrompt, MCPClientState, ToolExecutionRequest, ToolExecutionResult, ChatMessage } from '../services/mcpTypes';

export const useMCPClient = () => {
  const [state, setState] = useState<MCPClientState>({
    isConnected: false,
    isLoading: false,
    error: null,
    tools: [],
    resources: [],
    prompts: []
  });

  const initialize = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await mcpClient.initialize();
      
      // Load all available resources
      const [tools, resources, prompts] = await Promise.all([
        mcpClient.getTools(),
        mcpClient.getResources(),
        mcpClient.getPrompts()
      ]);

      setState(prev => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        tools,
        resources,
        prompts
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    await initialize();
  }, [initialize]);

  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      tools: [],
      resources: [],
      prompts: []
    }));
  }, []);

  const executeTool = useCallback(async (request: ToolExecutionRequest): Promise<ToolExecutionResult> => {
    return await mcpClient.executeTool(request);
  }, []);

  const sendMessage = useCallback(async (message: string): Promise<ChatMessage> => {
    // Simple implementation - in a real app this would send to an AI service
    return {
      role: 'assistant',
      content: [{
        type: 'text',
        text: `I received your message: "${message}". You can use the available tools to analyze data or perform specific tasks.`
      }]
    };
  }, []);

  const retry = useCallback(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    state,
    connect,
    disconnect,
    executeTool,
    sendMessage,
    initialize,
    retry,
    client: mcpClient,
    ...state
  };
}; 