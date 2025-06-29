# MCP Web Client Integration Guide for React Apps

A comprehensive guide for frontend developers to integrate Model Context
Protocol (MCP) client functionality into React web applications, providing
access to **18 total tools** including 9 Olorin fraud investigation tools, 5
LangChain community tools, and 4 enhanced MCP tools.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [MCP Client Implementation](#mcp-client-implementation)
4. [React Components](#react-components)
5. [API Integration](#api-integration)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Deployment](#deployment)

## 🛠️ Prerequisites

Before starting, ensure you have:

- **Node.js** (v18 or higher)
- **React** (v18 or higher)
- **TypeScript** (recommended)
- Basic understanding of WebSocket or HTTP communication
- Access to the Enhanced Olorin MCP Server endpoint
- **Optional**: API keys for additional LangChain tools (Tavily, OpenWeatherMap,
  etc.)
- Understanding of fraud investigation workflows (for Olorin tools)
- Python knowledge (for code execution tools)

## 📦 Project Setup

### Step 1: Install Required Dependencies

```bash
# Core dependencies
npm install @types/ws ws axios

# UI dependencies (optional but recommended)
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material

# State management (choose one)
npm install zustand  # Lightweight option
# OR
npm install @reduxjs/toolkit react-redux  # Full Redux

# Development dependencies
npm install --save-dev @types/node
```

### Step 2: Create Project Structure

```
src/
├── components/
│   ├── mcp/
│   │   ├── MCPClient.tsx
│   │   ├── MCPToolsPanel.tsx
│   │   ├── MCPResourcesPanel.tsx
│   │   └── MCPPromptsPanel.tsx
│   └── ui/
│       ├── LoadingSpinner.tsx
│       └── ErrorMessage.tsx
├── hooks/
│   ├── useMCPClient.ts
│   └── useMCPTools.ts
├── services/
│   ├── mcpClient.ts
│   └── mcpTypes.ts
├── store/
│   └── mcpStore.ts
└── utils/
    └── mcpHelpers.ts
```

## 🔌 MCP Client Implementation

### Step 3: Define MCP Types

Create `src/services/mcpTypes.ts`:

```typescript
// MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// Olorin-specific Types
export interface OlorinTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface OlorinResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface OlorinPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// Tool execution types
export interface ToolExecutionRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolExecutionResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    uri?: string;
  }>;
  isError?: boolean;
}
```

### Step 4: Create MCP Client Service

Create `src/services/mcpClient.ts`:

```typescript
import {
  MCPRequest,
  MCPResponse,
  OlorinTool,
  OlorinResource,
  OlorinPrompt,
  ToolExecutionRequest,
  ToolExecutionResult,
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
      const response = await fetch(`${this.httpBaseUrl}/health`);
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
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params,
    };

    try {
      const response = await fetch(`${this.httpBaseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const mcpResponse: MCPResponse = await response.json();

      if (mcpResponse.error) {
        throw new Error(`MCP Error: ${mcpResponse.error.message}`);
      }

      return mcpResponse.result;
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
  async executeTool(
    request: ToolExecutionRequest,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.sendHttpRequest('tools/call', {
        name: request.name,
        arguments: request.arguments,
      });

      return {
        content: result.content || [
          { type: 'text', text: JSON.stringify(result) },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
        isError: true,
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
  async getPrompt(name: string, arguments?: Record<string, any>): Promise<any> {
    try {
      const result = await this.sendHttpRequest('prompts/get', {
        name,
        arguments: arguments || {},
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
  process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3000',
);
```

### Step 5: Create React Hooks

Create `src/hooks/useMCPClient.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { OlorinTool, OlorinResource, OlorinPrompt } from '../services/mcpTypes';

export interface MCPClientState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  tools: OlorinTool[];
  resources: OlorinResource[];
  prompts: OlorinPrompt[];
}

export const useMCPClient = () => {
  const [state, setState] = useState<MCPClientState>({
    isConnected: false,
    isLoading: false,
    error: null,
    tools: [],
    resources: [],
    prompts: [],
  });

  const initialize = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await mcpClient.initialize();

      // Load all available resources
      const [tools, resources, prompts] = await Promise.all([
        mcpClient.getTools(),
        mcpClient.getResources(),
        mcpClient.getPrompts(),
      ]);

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        tools,
        resources,
        prompts,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    initialize,
    client: mcpClient,
  };
};
```

Create `src/hooks/useMCPTools.ts`:

```typescript
import { useState, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import {
  ToolExecutionRequest,
  ToolExecutionResult,
} from '../services/mcpTypes';

export const useMCPTools = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<
    Array<{
      request: ToolExecutionRequest;
      result: ToolExecutionResult;
      timestamp: Date;
    }>
  >([]);

  const executeTool = useCallback(
    async (request: ToolExecutionRequest): Promise<ToolExecutionResult> => {
      setIsExecuting(true);

      try {
        const result = await mcpClient.executeTool(request);

        setExecutionHistory((prev) => [
          ...prev,
          {
            request,
            result,
            timestamp: new Date(),
          },
        ]);

        return result;
      } finally {
        setIsExecuting(false);
      }
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  return {
    executeTool,
    isExecuting,
    executionHistory,
    clearHistory,
  };
};
```

## 🎨 React Components

### Step 6: Create Main MCP Client Component

Create `src/components/mcp/MCPClient.tsx`:

```typescript
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Container,
} from '@mui/material';
import { useMCPClient } from '../../hooks/useMCPClient';
import { MCPToolsPanel } from './MCPToolsPanel';
import { MCPResourcesPanel } from './MCPResourcesPanel';
import { MCPPromptsPanel } from './MCPPromptsPanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const MCPClient: React.FC = () => {
  const { isConnected, isLoading, error, tools, resources, prompts, client } =
    useMCPClient();
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Connecting to Olorin MCP Server...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ m: 2 }}>
          <Typography variant="h6">Connection Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Container>
    );
  }

  if (!isConnected) {
    return (
      <Container maxWidth="md">
        <Alert severity="warning" sx={{ m: 2 }}>
          <Typography variant="h6">Not Connected</Typography>
          <Typography variant="body2">
            Unable to connect to MCP Server
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Paper elevation={2} sx={{ m: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h4" gutterBottom>
            🚀 Olorin MCP Client
          </Typography>

          <Alert severity="success" sx={{ mb: 2 }}>
            Connected to Olorin MCP Server • {tools.length} tools •{' '}
            {resources.length} resources • {prompts.length} prompts
          </Alert>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label={`Tools (${tools.length})`} />
              <Tab label={`Resources (${resources.length})`} />
              <Tab label={`Prompts (${prompts.length})`} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <MCPToolsPanel tools={tools} client={client} />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <MCPResourcesPanel resources={resources} client={client} />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <MCPPromptsPanel prompts={prompts} client={client} />
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};
```

### Step 7: Create Tools Panel Component

Create `src/components/mcp/MCPToolsPanel.tsx`:

```typescript
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Grid,
  CircularProgress,
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import { OlorinTool } from '../../services/mcpTypes';
import { MCPWebClient } from '../../services/mcpClient';
import { useMCPTools } from '../../hooks/useMCPTools';

interface MCPToolsPanelProps {
  tools: OlorinTool[];
  client: MCPWebClient;
}

export const MCPToolsPanel: React.FC<MCPToolsPanelProps> = ({ tools }) => {
  const { executeTool, isExecuting, executionHistory } = useMCPTools();
  const [selectedTool, setSelectedTool] = useState<OlorinTool | null>(null);
  const [toolArguments, setToolArguments] = useState<Record<string, any>>({});
  const [executionResult, setExecutionResult] = useState<string>('');

  const handleToolSelect = (tool: OlorinTool) => {
    setSelectedTool(tool);
    setToolArguments({});
    setExecutionResult('');
  };

  const handleArgumentChange = (argName: string, value: any) => {
    setToolArguments((prev) => ({
      ...prev,
      [argName]: value,
    }));
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;

    try {
      const result = await executeTool({
        name: selectedTool.name,
        arguments: toolArguments,
      });

      const resultText = result.content
        .map((c) => c.text || c.data || c.uri)
        .join('\n');

      setExecutionResult(resultText);
    } catch (error) {
      setExecutionResult(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const renderArgumentInput = (argName: string, argSchema: any) => {
    const isRequired = selectedTool?.inputSchema.required?.includes(argName);

    return (
      <TextField
        key={argName}
        fullWidth
        label={argName}
        required={isRequired}
        value={toolArguments[argName] || ''}
        onChange={(e) => handleArgumentChange(argName, e.target.value)}
        helperText={argSchema.description}
        margin="normal"
        multiline={argSchema.type === 'object'}
        rows={argSchema.type === 'object' ? 3 : 1}
      />
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🛠️ Available Tools
      </Typography>

      <Grid container spacing={2}>
        {tools.map((tool) => (
          <Grid item xs={12} md={6} key={tool.name}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {tool.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {tool.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  {tool.inputSchema.required?.map((req) => (
                    <Chip
                      key={req}
                      label={`${req} *`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>

                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={() => handleToolSelect(tool)}
                  fullWidth
                >
                  Execute Tool
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tool Execution Dialog */}
      <Dialog
        open={!!selectedTool}
        onClose={() => setSelectedTool(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Execute Tool: {selectedTool?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            {selectedTool?.description}
          </Typography>

          {selectedTool &&
            Object.entries(selectedTool.inputSchema.properties || {}).map(
              ([argName, argSchema]) => renderArgumentInput(argName, argSchema),
            )}

          {executionResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Result:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={executionResult}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTool(null)}>Cancel</Button>
          <Button
            onClick={handleExecuteTool}
            variant="contained"
            disabled={isExecuting}
            startIcon={
              isExecuting ? <CircularProgress size={16} /> : <PlayArrow />
            }
          >
            {isExecuting ? 'Executing...' : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Execution History */}
      {executionHistory.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            📜 Recent Executions
          </Typography>
          {executionHistory.slice(-3).map((execution, index) => (
            <Alert
              key={index}
              severity={execution.result.isError ? 'error' : 'success'}
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2">
                {execution.request.name} -{' '}
                {execution.timestamp.toLocaleTimeString()}
              </Typography>
              <Typography variant="body2">
                {execution.result.content[0]?.text?.substring(0, 100)}...
              </Typography>
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
};
```

### Step 8: Create Resources and Prompts Panels

Create `src/components/mcp/MCPResourcesPanel.tsx`:

```typescript
import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
} from '@mui/material';
import { Folder, Visibility } from '@mui/icons-material';
import { OlorinResource } from '../../services/mcpTypes';
import { MCPWebClient } from '../../services/mcpClient';

interface MCPResourcesPanelProps {
  resources: OlorinResource[];
  client: MCPWebClient;
}

export const MCPResourcesPanel: React.FC<MCPResourcesPanelProps> = ({
  resources,
  client,
}) => {
  const [selectedResource, setSelectedResource] = useState<OlorinResource | null>(
    null,
  );
  const [resourceContent, setResourceContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResourceClick = async (resource: OlorinResource) => {
    setSelectedResource(resource);
    setIsLoading(true);

    try {
      const content = await client.getResource(resource.uri);
      setResourceContent(content);
    } catch (error) {
      setResourceContent(
        `Error loading resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        📁 Available Resources
      </Typography>

      <List>
        {resources.map((resource) => (
          <ListItem
            key={resource.uri}
            button
            onClick={() => handleResourceClick(resource)}
          >
            <ListItemIcon>
              <Folder />
            </ListItemIcon>
            <ListItemText
              primary={resource.name}
              secondary={resource.description || resource.uri}
            />
            <IconButton>
              <Visibility />
            </IconButton>
          </ListItem>
        ))}
      </List>

      {/* Resource Content Dialog */}
      <Dialog
        open={!!selectedResource}
        onClose={() => setSelectedResource(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Resource: {selectedResource?.name}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={isLoading ? 'Loading...' : resourceContent}
            InputProps={{ readOnly: true }}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedResource(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

Create `src/components/mcp/MCPPromptsPanel.tsx`:

```typescript
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
} from '@mui/material';
import { Chat, Send } from '@mui/icons-material';
import { OlorinPrompt } from '../../services/mcpTypes';
import { MCPWebClient } from '../../services/mcpClient';

interface MCPPromptsPanelProps {
  prompts: OlorinPrompt[];
  client: MCPWebClient;
}

export const MCPPromptsPanel: React.FC<MCPPromptsPanelProps> = ({
  prompts,
  client,
}) => {
  const [selectedPrompt, setSelectedPrompt] = useState<OlorinPrompt | null>(null);
  const [promptArguments, setPromptArguments] = useState<Record<string, any>>(
    {},
  );
  const [promptResult, setPromptResult] = useState<string>('');

  const handlePromptSelect = (prompt: OlorinPrompt) => {
    setSelectedPrompt(prompt);
    setPromptArguments({});
    setPromptResult('');
  };

  const handleArgumentChange = (argName: string, value: string) => {
    setPromptArguments((prev) => ({
      ...prev,
      [argName]: value,
    }));
  };

  const handleExecutePrompt = async () => {
    if (!selectedPrompt) return;

    try {
      const result = await client.getPrompt(
        selectedPrompt.name,
        promptArguments,
      );
      setPromptResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setPromptResult(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        💬 Available Prompts
      </Typography>

      <Grid container spacing={2}>
        {prompts.map((prompt) => (
          <Grid item xs={12} md={6} key={prompt.name}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {prompt.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {prompt.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  {prompt.arguments
                    ?.filter((arg) => arg.required)
                    .map((arg) => (
                      <Chip
                        key={arg.name}
                        label={`${arg.name} *`}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                </Box>

                <Button
                  variant="contained"
                  startIcon={<Chat />}
                  onClick={() => handlePromptSelect(prompt)}
                  fullWidth
                >
                  Use Prompt
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Prompt Execution Dialog */}
      <Dialog
        open={!!selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Use Prompt: {selectedPrompt?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            {selectedPrompt?.description}
          </Typography>

          {selectedPrompt?.arguments?.map((arg) => (
            <TextField
              key={arg.name}
              fullWidth
              label={arg.name}
              required={arg.required}
              value={promptArguments[arg.name] || ''}
              onChange={(e) => handleArgumentChange(arg.name, e.target.value)}
              helperText={arg.description}
              margin="normal"
            />
          ))}

          {promptResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Generated Prompt:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={promptResult}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedPrompt(null)}>Cancel</Button>
          <Button
            onClick={handleExecutePrompt}
            variant="contained"
            startIcon={<Send />}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

## 🔗 API Integration

### Step 9: Environment Configuration

Create `.env` file:

```env
# MCP Server Configuration
REACT_APP_MCP_SERVER_URL=http://localhost:8000

# Optional: Authentication
REACT_APP_MCP_API_KEY=your-api-key-here

# Optional: LangChain Tool API Keys (configure on server side)
# TAVILY_API_KEY=your-tavily-key
# OPENWEATHERMAP_API_KEY=your-weather-key
# WOLFRAM_ALPHA_APPID=your-wolfram-key
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
# SLACK_BOT_TOKEN=your-slack-token
```

### Tool Configuration

The Enhanced Olorin MCP Server supports multiple tool categories:

#### ✅ Always Available Tools

- **Olorin Tools**: All 9 fraud investigation tools
- **Core LangChain Tools**: Python REPL, file operations, Yahoo Finance
- **Enhanced MCP Tools**: All 4 comprehensive tools

#### 🔑 API Key Required Tools

To enable additional LangChain tools, configure these environment variables on
the **server side**:

```bash
# Search Tools
export TAVILY_API_KEY="your_tavily_key"
export OPENWEATHERMAP_API_KEY="your_weather_key"

# Communication Tools
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/google-credentials.json"
export SLACK_BOT_TOKEN="your_slack_token"

# Math Tools
export WOLFRAM_ALPHA_APPID="your_wolfram_key"

# GitHub Tools
export GITHUB_TOKEN="your_github_token"
```

### Step 10: Integration with Main App

Update your main `App.tsx`:

```typescript
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container } from '@mui/material';
import { MCPClient } from './components/mcp/MCPClient';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MCPClient />
    </ThemeProvider>
  );
}

export default App;
```

## 🚨 Error Handling

### Step 11: Create Error Boundary

Create `src/components/ui/ErrorBoundary.tsx`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MCP Client Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ m: 2 }}>
          <Alert severity="error">
            <AlertTitle>Something went wrong with the MCP Client</AlertTitle>
            {this.state.error?.message}

            <Button
              variant="outlined"
              onClick={() => this.setState({ hasError: false })}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

## 🧪 Testing

### Step 12: Create Test Suite

Create `src/services/__tests__/mcpClient.test.ts`:

```typescript
import { MCPWebClient } from '../mcpClient';

// Mock fetch for testing
global.fetch = jest.fn();

describe('MCPWebClient', () => {
  let client: MCPWebClient;

  beforeEach(() => {
    client = new MCPWebClient('http://localhost:3000');
    (fetch as jest.Mock).mockClear();
  });

  test('should initialize successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    });

    await expect(client.initialize()).resolves.toBeUndefined();
  });

  test('should get tools list', async () => {
    const mockTools = [
      { name: 'splunk_query', description: 'Execute Splunk queries' },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { tools: mockTools },
      }),
    });

    const tools = await client.getTools();
    expect(tools).toEqual(mockTools);
  });
});
```

## 🚀 Deployment

### Step 13: Build Configuration

Update `package.json`:

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "build:prod": "REACT_APP_MCP_SERVER_URL=https://your-mcp-server.com npm run build"
  }
}
```

## 📚 Usage Examples

### Olorin Tools Examples

#### Example 1: Execute Splunk Query

```typescript
const executeSplunkQuery = async () => {
  const result = await mcpClient.executeTool({
    name: 'splunk_query',
    arguments: {
      query: 'search index=main | head 10',
    },
  });

  console.log('Splunk Results:', result.content[0].text);
};
```

#### Example 2: Get Identity Information

```typescript
const getUserInfo = async (userId: string) => {
  const result = await mcpClient.executeTool({
    name: 'oii_lookup',
    arguments: {
      user_id: userId,
    },
  });

  return JSON.parse(result.content[0].text);
};
```

#### Example 3: CDC User Lookup

```typescript
const getCDCUserInfo = async (userId: string) => {
  const result = await mcpClient.executeTool({
    name: 'cdc_user',
    arguments: {
      user_id: userId,
    },
  });

  return JSON.parse(result.content[0].text);
};
```

#### Example 4: Vector Similarity Search

```typescript
const performVectorSearch = async (targetRecord: any, candidates: any[]) => {
  const result = await mcpClient.executeTool({
    name: 'vector_search',
    arguments: {
      target_record: targetRecord,
      candidate_records: candidates,
      max_results: 10,
    },
  });

  return JSON.parse(result.content[0].text);
};
```

### LangChain Tools Examples

#### Example 5: Execute Python Code

```typescript
const runPythonAnalysis = async () => {
  const code = `
import pandas as pd
import numpy as np

# Sample fraud detection analysis
data = {
    'transaction_amount': [100, 200, 50000, 150, 300],
    'user_age': [25, 35, 45, 30, 28],
    'location': ['US', 'US', 'Unknown', 'US', 'CA']
}

df = pd.DataFrame(data)
anomalies = df[df['transaction_amount'] > 10000]
print(f"Potential fraud transactions: {len(anomalies)}")
print(anomalies.to_string())
`;

  const result = await mcpClient.executeTool({
    name: 'langchain_python_repl',
    arguments: {
      query: code,
    },
  });

  console.log('Python Analysis Result:', result.content[0].text);
};
```

#### Example 6: File Operations

```typescript
const analyzeLogFile = async () => {
  // Read a log file
  const readResult = await mcpClient.executeTool({
    name: 'file_operations',
    arguments: {
      operation: 'read',
      path: '/path/to/fraud_logs.txt',
    },
  });

  console.log('Log contents:', readResult.content[0].text);

  // Write analysis results
  const analysisResults =
    'Fraud analysis completed: 3 suspicious transactions found';

  await mcpClient.executeTool({
    name: 'file_operations',
    arguments: {
      operation: 'write',
      path: '/path/to/analysis_results.txt',
      content: analysisResults,
    },
  });
};
```

#### Example 7: Comprehensive Search

```typescript
const searchForFraudInfo = async (query: string) => {
  const result = await mcpClient.executeTool({
    name: 'comprehensive_search',
    arguments: {
      query: query,
      search_type: 'web',
    },
  });

  console.log('Search Results:', result.content[0].text);
};

// Usage
await searchForFraudInfo('credit card fraud detection techniques 2024');
```

#### Example 8: Web Requests

```typescript
const checkExternalAPI = async () => {
  const result = await mcpClient.executeTool({
    name: 'web_request',
    arguments: {
      url: 'https://api.example.com/fraud-indicators',
      method: 'GET',
    },
  });

  return JSON.parse(result.content[0].text);
};
```

#### Example 9: Financial News Analysis

```typescript
const getFinancialNews = async () => {
  const result = await mcpClient.executeTool({
    name: 'langchain_yahoo_finance_news',
    arguments: {
      query: 'fraud financial crime',
    },
  });

  console.log('Financial News:', result.content[0].text);
};
```

### Enhanced MCP Tools Examples

#### Example 10: Multi-Tool Fraud Investigation Workflow

```typescript
const conductFraudInvestigation = async (
  userId: string,
  transactionId: string,
) => {
  try {
    // Step 1: Get user identity information
    const identityResult = await mcpClient.executeTool({
      name: 'oii_lookup',
      arguments: { user_id: userId },
    });

    // Step 2: Get CDC user attributes
    const cdcResult = await mcpClient.executeTool({
      name: 'cdc_user',
      arguments: { user_id: userId },
    });

    // Step 3: Search Splunk for related transactions
    const splunkResult = await mcpClient.executeTool({
      name: 'splunk_query',
      arguments: {
        query: `search index=transactions user_id="${userId}" | head 100`,
      },
    });

    // Step 4: Analyze patterns with Python
    const analysisCode = `
# Analyze transaction patterns
import json
identity_data = ${identityResult.content[0].text}
cdc_data = ${cdcResult.content[0].text}
transactions = ${splunkResult.content[0].text}

# Perform fraud analysis
risk_score = 0
if identity_data.get('suspicious_activity'):
    risk_score += 30
if len(transactions) > 50:
    risk_score += 20
    
print(f"Risk Score: {risk_score}/100")
print(f"Recommendation: {'HIGH RISK' if risk_score > 50 else 'LOW RISK'}")
`;

    const analysisResult = await mcpClient.executeTool({
      name: 'langchain_python_repl',
      arguments: { query: analysisCode },
    });

    // Step 5: Generate investigation report
    const reportContent = `
Fraud Investigation Report
User ID: ${userId}
Transaction ID: ${transactionId}
Investigation Date: ${new Date().toISOString()}

Identity Information:
${identityResult.content[0].text}

CDC Attributes:
${cdcResult.content[0].text}

Transaction Analysis:
${analysisResult.content[0].text}

Recommendation: Further review required
`;

    // Step 6: Save report
    await mcpClient.executeTool({
      name: 'file_operations',
      arguments: {
        operation: 'write',
        path: `/reports/fraud_investigation_${userId}_${Date.now()}.txt`,
        content: reportContent,
      },
    });

    return {
      riskScore: analysisResult.content[0].text,
      reportSaved: true,
      investigationComplete: true,
    };
  } catch (error) {
    console.error('Investigation failed:', error);
    throw error;
  }
};
```

### Available Tool Categories

#### 🛠️ Olorin Tools (9 total)

- **splunk_query** - Execute Splunk SPL queries for log analysis
- **oii_lookup** - Online Identity Information lookup
- **cdc_user** - CDC user attribute retrieval
- **cdc_company** - CDC company attribute retrieval
- **qb_retriever** - QuickBooks knowledge base search
- **tt_retriever** - TurboTax knowledge base search
- **list_customers** - Customer listing functionality
- **vector_search** - Vector similarity search for transaction analysis
- **chronos** - Time series forecasting

#### 🔗 LangChain Tools (5 successfully integrated)

- **langchain_python_repl** - Execute Python code safely
- **langchain_read_file** - Read file contents
- **langchain_write_file** - Create and write files
- **langchain_list_directory** - Browse directory contents
- **langchain_yahoo_finance_news** - Access financial news and market data

#### ⚡ Enhanced MCP Tools (4 total)

- **comprehensive_search** - Multi-source search aggregation
- **execute_python_code** - Safe Python code execution
- **web_request** - HTTP GET/POST requests
- **file_operations** - Unified file management interface

#### 🔑 Additional LangChain Tools (Available with API keys)

- **Search Tools**: Tavily, DuckDuckGo, Google, Bing, Wikipedia, ArXiv
- **Communication Tools**: Gmail (5 tools), Slack (4 tools)
- **GitHub Tools**: Repository operations (6 tools)
- **Database Tools**: SQL operations (3 tools)
- **Specialized Tools**: Wolfram Alpha, Weather API, JSON tools

## 🎯 Next Steps

1. **Customize UI**: Adapt components to match your design system
2. **Add Authentication**: Implement proper authentication for MCP server access
3. **Error Monitoring**: Add error tracking (Sentry, LogRocket, etc.)
4. **Performance**: Implement caching and request optimization
5. **Real-time Updates**: Add WebSocket support for real-time tool execution
6. **Mobile Support**: Make components responsive for mobile devices

## 🤝 Support

For questions or issues:

- Check the MCP server logs at `/logs`
- Review the browser console for client-side errors
- Test individual API endpoints using the provided examples
- Refer to the MCP specification at
  [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

**Happy coding! 🚀** Your React app now has full MCP client capabilities to
interact with the Olorin MCP Server.
