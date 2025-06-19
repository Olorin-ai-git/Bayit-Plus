import React, { useState, useEffect } from 'react';
import { mcpClient, MCPTool, MCPToolResult } from '../services/MCPClient';

interface MCPToolsPanelProps {
  className?: string;
}

interface ToolExecution {
  toolName: string;
  arguments: Record<string, any>;
  result?: MCPToolResult;
  loading: boolean;
  error?: string;
}

const MCPToolsPanel: React.FC<MCPToolsPanelProps> = ({ className = '' }) => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [olorinTools, setOlorinTools] = useState<MCPTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [toolArguments, setToolArguments] = useState<Record<string, any>>({});
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Connect to MCP server on component mount
  useEffect(() => {
    const initializeMCP = async () => {
      try {
        setLoading(true);
        
        // For the bridge approach, we'll use the FastAPI endpoints directly
        const response = await fetch('/api/mcp/tools');
        if (response.ok) {
          const allTools = await response.json();
          setTools(allTools);
          
          // Get Olorin-specific tools
          const olorinResponse = await fetch('/api/mcp/tools/olorin');
          if (olorinResponse.ok) {
            const olorinToolsData = await olorinResponse.json();
            setOlorinTools(olorinToolsData);
          }
          
          setConnected(true);
        }
      } catch (error) {
        console.error('Failed to connect to MCP server:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeMCP();
  }, []);

  const handleToolSelect = (tool: MCPTool) => {
    setSelectedTool(tool);
    setToolArguments({});
  };

  const handleArgumentChange = (key: string, value: any) => {
    setToolArguments(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const executeTool = async () => {
    if (!selectedTool) return;

    const execution: ToolExecution = {
      toolName: selectedTool.name,
      arguments: toolArguments,
      loading: true
    };

    setExecutions(prev => [execution, ...prev]);

    try {
      const response = await fetch(`/api/mcp/tools/${selectedTool.name}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ arguments: toolArguments })
      });

      const result = await response.json();
      
      setExecutions(prev => prev.map(exec => 
        exec === execution 
          ? { ...exec, loading: false, result, error: result.success ? undefined : result.error }
          : exec
      ));
    } catch (error) {
      setExecutions(prev => prev.map(exec => 
        exec === execution 
          ? { ...exec, loading: false, error: error instanceof Error ? error.message : 'Unknown error' }
          : exec
      ));
    }
  };

  const renderToolSchema = (tool: MCPTool) => {
    if (!tool.schema || !tool.schema.properties) return null;

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Tool Parameters:</h4>
        {Object.entries(tool.schema.properties).map(([key, schema]: [string, any]) => (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {key}
              {tool.schema?.required?.includes(key) && <span className="text-red-500">*</span>}
            </label>
            <div className="text-xs text-gray-500">{schema.description}</div>
            
            {schema.type === 'string' && (
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={schema.description}
                value={toolArguments[key] || ''}
                onChange={(e) => handleArgumentChange(key, e.target.value)}
              />
            )}
            
            {schema.type === 'array' && (
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter comma-separated values"
                value={Array.isArray(toolArguments[key]) ? toolArguments[key].join(', ') : ''}
                onChange={(e) => handleArgumentChange(key, e.target.value.split(',').map(s => s.trim()).filter(s => s))}
              />
            )}
            
            {schema.type === 'number' && (
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={schema.description}
                value={toolArguments[key] || ''}
                onChange={(e) => handleArgumentChange(key, parseFloat(e.target.value) || 0)}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderExecutionResult = (execution: ToolExecution) => {
    if (execution.loading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>Executing...</span>
        </div>
      );
    }

    if (execution.error) {
      return (
        <div className="text-red-600 bg-red-50 p-3 rounded-md">
          <strong>Error:</strong> {execution.error}
        </div>
      );
    }

    if (execution.result) {
      return (
        <div className="bg-gray-50 p-3 rounded-md">
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(execution.result, null, 2)}
          </pre>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span>Connecting to MCP server...</span>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <h3 className="text-lg font-medium">MCP Server Not Available</h3>
          <p className="mt-2">Unable to connect to the MCP server. Please ensure it's running.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold text-gray-900">MCP Tools Panel</h2>
        <p className="text-sm text-gray-600 mt-1">
          Connected to MCP server • {tools.length} tools available
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Available Tools</h3>
          
          {/* Olorin Tools Section */}
          {olorinTools.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">Olorin Tools</h4>
              <div className="space-y-1">
                {olorinTools.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => handleToolSelect(tool)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedTool?.name === tool.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{tool.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{tool.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Other Tools */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-600">Other Tools</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {tools.filter(tool => !olorinTools.find(ot => ot.name === tool.name)).map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => handleToolSelect(tool)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    selectedTool?.name === tool.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{tool.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{tool.description}</div>
                  <div className="text-xs text-blue-500 mt-1">Category: {tool.category}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tool Execution */}
        <div className="space-y-4">
          {selectedTool ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedTool.name}</h3>
                <p className="text-sm text-gray-600">{selectedTool.description}</p>
              </div>

              {renderToolSchema(selectedTool)}

              <button
                onClick={executeTool}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Execute Tool
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>Select a tool to view its parameters and execute it</p>
            </div>
          )}
        </div>
      </div>

      {/* Execution History */}
      {executions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Execution History</h3>
          <div className="space-y-3">
            {executions.map((execution, index) => (
              <div key={index} className="border rounded-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{execution.toolName}</span>
                  <span className="text-xs text-gray-500">
                    {JSON.stringify(execution.arguments)}
                  </span>
                </div>
                {renderExecutionResult(execution)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPToolsPanel; 