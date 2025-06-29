import { useState, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { ToolExecutionRequest, ToolExecutionResult } from '../services/mcpTypes';

export const useMCPTools = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<Array<{
    request: ToolExecutionRequest;
    result: ToolExecutionResult;
    timestamp: Date;
  }>>([]);

  const executeTool = useCallback(async (request: ToolExecutionRequest): Promise<ToolExecutionResult> => {
    setIsExecuting(true);
    
    try {
      const result = await mcpClient.executeTool(request);
      
      setExecutionHistory(prev => [...prev, {
        request,
        result,
        timestamp: new Date()
      }]);
      
      return result;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  return {
    executeTool,
    isExecuting,
    executionHistory,
    clearHistory
  };
}; 