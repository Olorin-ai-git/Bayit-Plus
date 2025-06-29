# OLORIN MCP Frontend Developer Specification
## Complete Implementation Guide for Frontend Developers

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Target Audience**: Frontend developers, UI/UX engineers, system integrators

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Integration](#api-integration)
3. [UI Components](#ui-components)
4. [State Management](#state-management)
5. [Tool Integration](#tool-integration)
6. [Prompt System](#prompt-system)
7. [Real-time Features](#real-time-features)
8. [Security Implementation](#security-implementation)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Guide](#deployment-guide)

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
├─────────────────────────────────────────────────────────┤
│  React/Vue/Angular App                                  │
│  ├── Investigation Dashboard                            │
│  ├── Tool Management Panel                              │
│  ├── Prompt Interface                                   │
│  ├── Results Visualization                              │
│  └── WebSocket Client                                   │
├─────────────────────────────────────────────────────────┤
│                    API Layer                            │
├─────────────────────────────────────────────────────────┤
│  MCP Server (Port 3000)                                │
│  ├── Tool Endpoints                                     │
│  ├── Prompt Endpoints                                   │
│  ├── WebSocket Server                                   │
│  └── Authentication                                     │
├─────────────────────────────────────────────────────────┤
│                   Backend Services                      │
├─────────────────────────────────────────────────────────┤
│  OLORIN Core Services                                     │
│  ├── Splunk Integration                                 │
│  ├── Identity Services                                  │
│  ├── Risk Assessment                                    │
│  └── Data Analysis                                      │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack Requirements

#### Core Framework Options
- **React** (Recommended): v18+ with hooks
- **Vue.js**: v3+ with Composition API
- **Angular**: v15+ with standalone components

#### Required Dependencies
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "socket.io-client": "^4.7.0",
    "recharts": "^2.8.0",
    "react-query": "^3.39.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "headlessui": "^1.7.0"
  }
}
```

---

## 🔌 API Integration

### Base Configuration

```typescript
// config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_MCP_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  WEBSOCKET_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:3000/ws'
};

// utils/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Core API Endpoints

#### 1. Tool Execution API

```typescript
// types/tools.ts
export interface ToolRequest {
  tool_name: string;
  arguments: Record<string, any>;
  timeout?: number;
}

export interface ToolResponse {
  success: boolean;
  result: any;
  error?: string;
  execution_time: number;
  tool_name: string;
}

// services/toolService.ts
export class ToolService {
  static async executeTool(request: ToolRequest): Promise<ToolResponse> {
    const response = await apiClient.post('/tools/execute', request);
    return response.data;
  }

  static async getAvailableTools(): Promise<string[]> {
    const response = await apiClient.get('/tools/list');
    return response.data.tools;
  }

  static async getToolSchema(toolName: string): Promise<any> {
    const response = await apiClient.get(`/tools/${toolName}/schema`);
    return response.data;
  }
}
```

#### 2. Prompt System API

```typescript
// types/prompts.ts
export interface PromptRequest {
  prompt_name: string;
  arguments: Record<string, any>;
}

export interface PromptResponse {
  success: boolean;
  content: string;
  metadata: {
    prompt_name: string;
    character_count: number;
    quality_score: number;
  };
}

// services/promptService.ts
export class PromptService {
  static async executePrompt(request: PromptRequest): Promise<PromptResponse> {
    const response = await apiClient.post('/prompts/execute', request);
    return response.data;
  }

  static async getAvailablePrompts(): Promise<string[]> {
    const response = await apiClient.get('/prompts/list');
    return response.data.prompts;
  }
}
```

---

## 🎨 UI Components

### Main Dashboard Component

```tsx
// components/InvestigationDashboard.tsx
import React, { useState, useEffect } from 'react';
import { ToolPanel } from './ToolPanel';
import { PromptPanel } from './PromptPanel';
import { ResultsPanel } from './ResultsPanel';
import { useInvestigationStore } from '../stores/investigationStore';

export const InvestigationDashboard: React.FC = () => {
  const { currentInvestigation, tools, prompts } = useInvestigationStore();
  const [activeTab, setActiveTab] = useState<'tools' | 'prompts' | 'results'>('tools');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              OLORIN MCP Investigation Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <InvestigationSelector />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['tools', 'prompts', 'results'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Panel */}
          <div className="lg:col-span-1">
            {activeTab === 'tools' && <ToolPanel />}
            {activeTab === 'prompts' && <PromptPanel />}
          </div>

          {/* Main Panel */}
          <div className="lg:col-span-3">
            <ResultsPanel activeTab={activeTab} />
          </div>
        </div>
      </main>
    </div>
  );
};
```

### Tool Panel Component

```tsx
// components/ToolPanel.tsx
import React, { useState } from 'react';
import { ToolService } from '../services/toolService';
import { useInvestigationStore } from '../stores/investigationStore';

interface Tool {
  name: string;
  category: 'fraud_investigation' | 'data_analysis' | 'search' | 'utility';
  description: string;
  parameters: Record<string, any>;
}

export const ToolPanel: React.FC = () => {
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolParameters, setToolParameters] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { addResult } = useInvestigationStore();

  const toolCategories = {
    fraud_investigation: {
      title: 'Fraud Investigation',
      icon: '🕵️',
      tools: ['splunk_query', 'oii_tool', 'chronos_tool', 'vector_search_tool']
    },
    data_analysis: {
      title: 'Data Analysis',
      icon: '📊',
      tools: ['python_repl']
    },
    search: {
      title: 'Search Tools',
      icon: '🔍',
      tools: ['ddg_search', 'arxiv', 'tavily_search']
    },
    utility: {
      title: 'Utilities',
      icon: '🛠️',
      tools: ['read_file', 'list_directory']
    }
  };

  const executeTool = async () => {
    if (!selectedTool) return;
    
    setIsExecuting(true);
    try {
      const result = await ToolService.executeTool({
        tool_name: selectedTool.name,
        arguments: toolParameters
      });
      
      addResult({
        type: 'tool',
        toolName: selectedTool.name,
        result: result.result,
        timestamp: new Date(),
        success: result.success,
        executionTime: result.execution_time
      });
    } catch (error) {
      console.error('Tool execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Investigation Tools</h2>
      
      {/* Tool Categories */}
      <div className="space-y-4">
        {Object.entries(toolCategories).map(([category, config]) => (
          <div key={category} className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">
              {config.icon} {config.title}
            </h3>
            <div className="space-y-2">
              {config.tools.map((toolName) => (
                <button
                  key={toolName}
                  onClick={() => setSelectedTool({ name: toolName } as Tool)}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded"
                >
                  {toolName.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tool Configuration */}
      {selectedTool && (
        <div className="mt-6 border-t pt-6">
          <h3 className="font-medium mb-4">Configure {selectedTool.name}</h3>
          <ToolParameterForm
            tool={selectedTool}
            parameters={toolParameters}
            onChange={setToolParameters}
          />
          <button
            onClick={executeTool}
            disabled={isExecuting}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isExecuting ? 'Executing...' : 'Execute Tool'}
          </button>
        </div>
      )}
    </div>
  );
};
```

### Results Visualization

```tsx
// components/ResultsPanel.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useInvestigationStore } from '../stores/investigationStore';

export const ResultsPanel: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { results, currentInvestigation } = useInvestigationStore();

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Results Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Investigation Results</h2>
        <p className="text-sm text-gray-600">
          {results.length} results for investigation: {currentInvestigation?.id}
        </p>
      </div>

      {/* Results Content */}
      <div className="p-6">
        {results.length === 0 ? (
          <EmptyState activeTab={activeTab} />
        ) : (
          <div className="space-y-6">
            {results.map((result, index) => (
              <ResultCard key={index} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ResultCard: React.FC<{ result: any }> = ({ result }) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">
            {result.type === 'tool' ? `🛠️ ${result.toolName}` : `📝 ${result.promptName}`}
          </h3>
          <p className="text-sm text-gray-500">
            {result.timestamp.toLocaleString()} • {result.executionTime}ms
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${
          result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {result.success ? 'Success' : 'Failed'}
        </span>
      </div>
      
      <div className="bg-gray-50 rounded p-3">
        <pre className="text-sm overflow-x-auto">
          {JSON.stringify(result.result, null, 2)}
        </pre>
      </div>
    </div>
  );
};
```

---

## 🔄 State Management

### Investigation Store (Zustand)

```typescript
// stores/investigationStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Investigation {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

interface InvestigationResult {
  type: 'tool' | 'prompt';
  toolName?: string;
  promptName?: string;
  result: any;
  timestamp: Date;
  success: boolean;
  executionTime: number;
}

interface InvestigationStore {
  // State
  currentInvestigation: Investigation | null;
  investigations: Investigation[];
  results: InvestigationResult[];
  isLoading: boolean;
  
  // Actions
  setCurrentInvestigation: (investigation: Investigation) => void;
  addResult: (result: InvestigationResult) => void;
  clearResults: () => void;
  createInvestigation: (title: string) => void;
  updateInvestigation: (id: string, updates: Partial<Investigation>) => void;
}

export const useInvestigationStore = create<InvestigationStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentInvestigation: null,
      investigations: [],
      results: [],
      isLoading: false,
      
      // Actions
      setCurrentInvestigation: (investigation) => 
        set({ currentInvestigation: investigation }),
      
      addResult: (result) => 
        set((state) => ({ 
          results: [...state.results, result] 
        })),
      
      clearResults: () => 
        set({ results: [] }),
      
      createInvestigation: (title) => {
        const newInvestigation: Investigation = {
          id: `inv_${Date.now()}`,
          title,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          investigations: [...state.investigations, newInvestigation],
          currentInvestigation: newInvestigation,
        }));
      },
      
      updateInvestigation: (id, updates) =>
        set((state) => ({
          investigations: state.investigations.map((inv) =>
            inv.id === id ? { ...inv, ...updates, updatedAt: new Date() } : inv
          ),
          currentInvestigation: 
            state.currentInvestigation?.id === id 
              ? { ...state.currentInvestigation, ...updates, updatedAt: new Date() }
              : state.currentInvestigation,
        })),
    }),
    { name: 'investigation-store' }
  )
);
```

---

## 🔌 WebSocket Integration

### Real-time Updates

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useInvestigationStore } from '../stores/investigationStore';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { addResult, currentInvestigation } = useInvestigationStore();

  useEffect(() => {
    // Initialize WebSocket connection
    socketRef.current = io(API_CONFIG.WEBSOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 Connected to MCP WebSocket');
      
      // Join investigation room if active
      if (currentInvestigation) {
        socket.emit('join_investigation', currentInvestigation.id);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from MCP WebSocket');
    });

    // Tool execution updates
    socket.on('tool_progress', (data) => {
      console.log('🛠️ Tool progress:', data);
      // Update UI with progress information
    });

    socket.on('tool_completed', (data) => {
      console.log('✅ Tool completed:', data);
      addResult({
        type: 'tool',
        toolName: data.tool_name,
        result: data.result,
        timestamp: new Date(),
        success: data.success,
        executionTime: data.execution_time,
      });
    });

    // Investigation updates
    socket.on('investigation_updated', (data) => {
      console.log('📋 Investigation updated:', data);
      // Handle investigation updates
    });

    return () => {
      socket.disconnect();
    };
  }, [currentInvestigation?.id]);

  // Utility functions
  const joinInvestigation = (investigationId: string) => {
    socketRef.current?.emit('join_investigation', investigationId);
  };

  const leaveInvestigation = (investigationId: string) => {
    socketRef.current?.emit('leave_investigation', investigationId);
  };

  return {
    socket: socketRef.current,
    joinInvestigation,
    leaveInvestigation,
  };
};
```

---

## 🔒 Security Implementation

### Authentication & Authorization

```typescript
// services/authService.ts
export class AuthService {
  private static TOKEN_KEY = 'olorin_mcp_token';
  private static REFRESH_TOKEN_KEY = 'olorin_mcp_refresh_token';

  static async login(credentials: { username: string; password: string }) {
    const response = await apiClient.post('/auth/login', credentials);
    const { token, refreshToken, user } = response.data;
    
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    
    return { token, user };
  }

  static async refreshToken() {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh token available');
    
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    const { token } = response.data;
    
    localStorage.setItem(this.TOKEN_KEY, token);
    return token;
  }

  static logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static isAuthenticated() {
    return !!this.getToken();
  }
}

// hooks/useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (AuthService.isAuthenticated()) {
          // Validate token and get user info
          const response = await apiClient.get('/auth/me');
          setUser(response.data.user);
        }
      } catch (error) {
        AuthService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: AuthService.isAuthenticated(),
    login: AuthService.login,
    logout: AuthService.logout,
  };
};
```

---

## 🧪 Testing Strategy

### Component Testing

```typescript
// __tests__/components/ToolPanel.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToolPanel } from '../components/ToolPanel';
import { ToolService } from '../services/toolService';

// Mock the tool service
jest.mock('../services/toolService');
const mockToolService = ToolService as jest.Mocked<typeof ToolService>;

describe('ToolPanel', () => {
  beforeEach(() => {
    mockToolService.getAvailableTools.mockResolvedValue([
      'splunk_query',
      'oii_tool',
      'chronos_tool'
    ]);
  });

  it('renders tool categories correctly', async () => {
    render(<ToolPanel />);
    
    expect(screen.getByText('🕵️ Fraud Investigation')).toBeInTheDocument();
    expect(screen.getByText('📊 Data Analysis')).toBeInTheDocument();
    expect(screen.getByText('🔍 Search Tools')).toBeInTheDocument();
  });

  it('executes tool when button is clicked', async () => {
    mockToolService.executeTool.mockResolvedValue({
      success: true,
      result: { data: 'test result' },
      execution_time: 1500,
      tool_name: 'splunk_query'
    });

    render(<ToolPanel />);
    
    // Select a tool
    fireEvent.click(screen.getByText('SPLUNK QUERY'));
    
    // Execute tool
    fireEvent.click(screen.getByText('Execute Tool'));
    
    await waitFor(() => {
      expect(mockToolService.executeTool).toHaveBeenCalledWith({
        tool_name: 'splunk_query',
        arguments: {}
      });
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/investigation-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestigationDashboard } from '../components/InvestigationDashboard';
import { server } from '../mocks/server';

describe('Investigation Flow Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('completes full investigation workflow', async () => {
    render(<InvestigationDashboard />);
    
    // Create new investigation
    fireEvent.click(screen.getByText('New Investigation'));
    fireEvent.change(screen.getByPlaceholderText('Investigation title'), {
      target: { value: 'Test Investigation' }
    });
    fireEvent.click(screen.getByText('Create'));
    
    // Execute a tool
    fireEvent.click(screen.getByText('Tools'));
    fireEvent.click(screen.getByText('SPLUNK QUERY'));
    fireEvent.click(screen.getByText('Execute Tool'));
    
    // Verify results appear
    await waitFor(() => {
      expect(screen.getByText('🛠️ splunk_query')).toBeInTheDocument();
    });
  });
});
```

---

## 🚀 Deployment Guide

### Build Configuration

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Environment Configuration

```bash
# .env.production
REACT_APP_MCP_URL=https://mcp.olorin.intuit.com
REACT_APP_WS_URL=wss://mcp.olorin.intuit.com/ws
REACT_APP_AUTH_URL=https://auth.olorin.intuit.com
REACT_APP_VERSION=2.0.0
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Performance Optimization

```typescript
// Performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  console.log('Performance metric:', metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Code splitting
const LazyToolPanel = React.lazy(() => import('./components/ToolPanel'));
const LazyPromptPanel = React.lazy(() => import('./components/PromptPanel'));

// Error boundary
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Frontend error:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if ((this.state as any).hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

---

## 📋 Implementation Checklist

### Phase 1: Core Setup
- [ ] Set up development environment
- [ ] Configure API client and authentication
- [ ] Implement basic routing and navigation
- [ ] Create main dashboard layout

### Phase 2: Tool Integration
- [ ] Implement tool panel component
- [ ] Add tool parameter forms
- [ ] Handle tool execution and results
- [ ] Add error handling and loading states

### Phase 3: Prompt System
- [ ] Create prompt interface
- [ ] Implement prompt execution
- [ ] Add prompt result visualization
- [ ] Handle long-running prompts

### Phase 4: Real-time Features
- [ ] Implement WebSocket connection
- [ ] Add real-time tool progress updates
- [ ] Handle connection failures and reconnection
- [ ] Add collaborative features

### Phase 5: Advanced Features
- [ ] Implement investigation management
- [ ] Add data visualization components
- [ ] Create export and reporting features
- [ ] Add user preferences and settings

### Phase 6: Testing & Deployment
- [ ] Write comprehensive tests
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment
- [ ] Implement monitoring and analytics

---

**Document Version**: 2.0.0  
**Last Updated**: January 27, 2025  
**Next Review**: April 2025

---

*This specification provides the complete implementation guide for frontend developers building the OLORIN MCP interface. Follow the phases sequentially for optimal development flow.* 