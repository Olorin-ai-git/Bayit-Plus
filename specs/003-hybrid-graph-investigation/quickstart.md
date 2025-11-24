# Quickstart Guide: Hybrid Graph Investigation UI

**Created**: 2025-01-21
**Target Audience**: Frontend Developers
**Prerequisites**: Node.js 18+, React experience, TypeScript knowledge

## Overview

<<<<<<< HEAD
This guide helps developers quickly set up and start developing the Hybrid Graph Investigation UI within the autonomous-investigation microservice. Follow these steps to get a working development environment with all 4 UI concepts.
=======
This guide helps developers quickly set up and start developing the Hybrid Graph Investigation UI within the structured-investigation microservice. Follow these steps to get a working development environment with all 4 UI concepts.
>>>>>>> 001-modify-analyzer-method

## Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Git**: Latest version
- **VS Code**: Recommended IDE with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Auto Rename Tag

### Knowledge Requirements
- React 18+ and React Hooks
- TypeScript fundamentals
- Tailwind CSS basics
- Graph visualization concepts (D3.js helpful but not required)
- WebSocket basics for real-time features

## Project Setup

### 1. Clone and Navigate to Project

```bash
# If not already in the project
cd /Users/gklainert/Documents/olorin/olorin-front

# Ensure you're on the correct branch
git checkout 003-hybrid-graph-investigation

# Install dependencies
npm install
```

### 2. Microservice Structure Setup

<<<<<<< HEAD
Create the autonomous-investigation microservice structure:

```bash
# Create microservice directory structure
mkdir -p src/microservices/autonomous-investigation/{components,hooks,stores,types,utils,assets}
mkdir -p src/microservices/autonomous-investigation/components/{power-grid,command-center,evidence-trail,network-explorer}
mkdir -p src/microservices/autonomous-investigation/components/shared/{graph,timeline,evidence,export}

# Create main microservice files
touch src/microservices/autonomous-investigation/App.tsx
touch src/microservices/autonomous-investigation/index.ts
touch src/microservices/autonomous-investigation/types/index.ts
touch src/microservices/autonomous-investigation/hooks/useInvestigation.ts
touch src/microservices/autonomous-investigation/stores/investigationStore.ts
=======
Create the structured-investigation microservice structure:

```bash
# Create microservice directory structure
mkdir -p src/microservices/structured-investigation/{components,hooks,stores,types,utils,assets}
mkdir -p src/microservices/structured-investigation/components/{power-grid,command-center,evidence-trail,network-explorer}
mkdir -p src/microservices/structured-investigation/components/shared/{graph,timeline,evidence,export}

# Create main microservice files
touch src/microservices/structured-investigation/App.tsx
touch src/microservices/structured-investigation/index.ts
touch src/microservices/structured-investigation/types/index.ts
touch src/microservices/structured-investigation/hooks/useInvestigation.ts
touch src/microservices/structured-investigation/stores/investigationStore.ts
>>>>>>> 001-modify-analyzer-method
```

### 3. Install Required Dependencies

```bash
# Core dependencies for graph visualization and UI
npm install @types/d3 d3 react-flow-renderer
npm install @tanstack/react-query zustand
npm install react-window react-window-infinite-loader
npm install @types/react-window

# Chart and visualization libraries
npm install recharts lucide-react

# Development dependencies
npm install --save-dev @types/d3
```

### 4. Configure TypeScript

Add to `tsconfig.json` (if not already present):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
<<<<<<< HEAD
      "@/autonomous-investigation/*": ["src/microservices/autonomous-investigation/*"],
=======
      "@/structured-investigation/*": ["src/microservices/structured-investigation/*"],
>>>>>>> 001-modify-analyzer-method
      "@/shared/*": ["src/shared/*"],
      "@/components/ui": ["src/shared/components/ui"]
    }
  }
}
```

## Core Implementation Setup

### 1. Main Microservice Entry Point

<<<<<<< HEAD
Create `src/microservices/autonomous-investigation/App.tsx`:
=======
Create `src/microservices/structured-investigation/App.tsx`:
>>>>>>> 001-modify-analyzer-method

```typescript
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PowerGridConcept } from './components/power-grid/PowerGridConcept';
import { CommandCenterConcept } from './components/command-center/CommandCenterConcept';
import { EvidenceTrailConcept } from './components/evidence-trail/EvidenceTrailConcept';
import { NetworkExplorerConcept } from './components/network-explorer/NetworkExplorerConcept';
import type { ConceptType } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

<<<<<<< HEAD
export default function AutonomousInvestigationApp() {
=======
export default function StructuredInvestigationApp() {
>>>>>>> 001-modify-analyzer-method
  const [selectedConcept, setSelectedConcept] = useState<ConceptType>('power_grid');

  const renderConcept = () => {
    switch (selectedConcept) {
      case 'power_grid':
        return <PowerGridConcept />;
      case 'command_center':
        return <CommandCenterConcept />;
      case 'evidence_trail':
        return <EvidenceTrailConcept />;
      case 'network_explorer':
        return <NetworkExplorerConcept />;
      default:
        return <PowerGridConcept />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-gray-50">
        {/* Concept Selector (for development) */}
        <div className="bg-white border-b p-4 flex space-x-2">
          {(['power_grid', 'command_center', 'evidence_trail', 'network_explorer'] as ConceptType[]).map(concept => (
            <button
              key={concept}
              onClick={() => setSelectedConcept(concept)}
              className={`px-4 py-2 rounded text-sm font-medium ${
                selectedConcept === concept
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {concept.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Selected Concept */}
        <div className="flex-1">
          {renderConcept()}
        </div>
      </div>
    </QueryClientProvider>
  );
}
```

### 2. TypeScript Definitions

<<<<<<< HEAD
Create `src/microservices/autonomous-investigation/types/index.ts`:
=======
Create `src/microservices/structured-investigation/types/index.ts`:
>>>>>>> 001-modify-analyzer-method

```typescript
// Re-export data model types
export * from '../../../shared/types/investigation';

// UI-specific types
export type ConceptType = 'power_grid' | 'command_center' | 'evidence_trail' | 'network_explorer';

export interface UIState {
  selectedConcept: ConceptType;
  selectedInvestigation?: string;
  lastViewedAt: string;
  bookmarked: boolean;
  notes: UINote[];
}

export interface UINote {
  id: string;
  content: string;
  timestamp: string;
  user_id: string;
  type: 'comment' | 'flag' | 'reminder';
}

// Graph visualization types
export interface GraphLayout {
  type: 'force' | 'radial' | 'hierarchical';
  config: {
    strength?: number;
    distance?: number;
    center?: { x: number; y: number };
    radius?: number;
  };
}

export interface GraphViewport {
  x: number;
  y: number;
  zoom: number;
}

// Timeline types
export interface TimelineFilter {
  actors: string[];
  actions: string[];
  success_only: boolean;
  importance_min: number;
  time_range?: {
    start: string;
    end: string;
  };
}

// Export types
export interface ExportConfig {
  format: 'pdf' | 'json' | 'csv' | 'markdown';
  template: 'executive' | 'detailed' | 'compliance' | 'technical';
  sections: string[];
  options: {
    include_raw_data: boolean;
    compress: boolean;
    digital_signature: boolean;
  };
}
```

### 3. Data Fetching Hooks

<<<<<<< HEAD
Create `src/microservices/autonomous-investigation/hooks/useInvestigation.ts`:
=======
Create `src/microservices/structured-investigation/hooks/useInvestigation.ts`:
>>>>>>> 001-modify-analyzer-method

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Investigation, Evidence, TimelineEvent, GraphData } from '../types';

const API_BASE = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001/api/v1'
  : '/api/v1';

// Investigation queries
export const useInvestigation = (investigationId: string) => {
  return useQuery({
    queryKey: ['investigation', investigationId],
    queryFn: async (): Promise<Investigation> => {
      const response = await fetch(`${API_BASE}/investigations/${investigationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch investigation');
      const result = await response.json();
      return result.data;
    },
    enabled: !!investigationId,
  });
};

export const useInvestigations = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ['investigations', filters],
    queryFn: async (): Promise<Investigation[]> => {
      const params = new URLSearchParams(filters as Record<string, string>);
      const response = await fetch(`${API_BASE}/investigations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch investigations');
      const result = await response.json();
      return result.data;
    },
  });
};

// Evidence queries
export const useEvidence = (investigationId: string, filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ['evidence', investigationId, filters],
    queryFn: async (): Promise<Evidence[]> => {
      const params = new URLSearchParams(filters as Record<string, string>);
      const response = await fetch(`${API_BASE}/investigations/${investigationId}/evidence?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch evidence');
      const result = await response.json();
      return result.data;
    },
    enabled: !!investigationId,
  });
};

// Timeline queries
export const useTimeline = (investigationId: string, filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ['timeline', investigationId, filters],
    queryFn: async (): Promise<TimelineEvent[]> => {
      const params = new URLSearchParams(filters as Record<string, string>);
      const response = await fetch(`${API_BASE}/investigations/${investigationId}/timeline?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch timeline');
      const result = await response.json();
      return result.data;
    },
    enabled: !!investigationId,
  });
};

// Graph data queries
export const useGraphData = (investigationId: string, layout?: string) => {
  return useQuery({
    queryKey: ['graph', investigationId, layout],
    queryFn: async (): Promise<GraphData> => {
      const params = layout ? `?layout=${layout}` : '';
      const response = await fetch(`${API_BASE}/investigations/${investigationId}/graph${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch graph data');
      const result = await response.json();
      return result.data;
    },
    enabled: !!investigationId,
  });
};

// Mutations
export const useCreateInvestigation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Investigation>): Promise<Investigation> => {
      const response = await fetch(`${API_BASE}/investigations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create investigation');
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] });
    },
  });
};

export const useUpdateInvestigation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Investigation> }): Promise<Investigation> => {
      const response = await fetch(`${API_BASE}/investigations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update investigation');
      const result = await response.json();
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investigation', data.id] });
      queryClient.invalidateQueries({ queryKey: ['investigations'] });
    },
  });
};
```

### 4. WebSocket Integration

<<<<<<< HEAD
Create `src/microservices/autonomous-investigation/hooks/useWebSocket.ts`:
=======
Create `src/microservices/structured-investigation/hooks/useWebSocket.ts`:
>>>>>>> 001-modify-analyzer-method

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  investigation_id?: string;
  data: unknown;
}

export const useInvestigationWebSocket = (investigationId?: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.NODE_ENV === 'development'
      ? 'ws://localhost:3001/ws/investigations'
      : 'wss://investigations.olorin.com/ws/investigations';

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');

      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        token: localStorage.getItem('jwt_token')
      }));

      // Subscribe to investigation if provided
      if (investigationId) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          investigation_id: investigationId
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, attempting to reconnect...');
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [investigationId]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'investigation.progress':
      case 'investigation.status_changed':
        queryClient.invalidateQueries({
          queryKey: ['investigation', message.investigation_id]
        });
        break;

      case 'evidence.found':
        queryClient.invalidateQueries({
          queryKey: ['evidence', message.investigation_id]
        });
        queryClient.invalidateQueries({
          queryKey: ['graph', message.investigation_id]
        });
        break;

      case 'risk.updated':
        queryClient.invalidateQueries({
          queryKey: ['investigation', message.investigation_id]
        });
        break;

      case 'timeline.event_created':
        queryClient.invalidateQueries({
          queryKey: ['timeline', message.investigation_id]
        });
        break;

      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  }, [queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send: (message: object) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    }
  };
};
```

## Development Workflow

### 1. Start Development Server

```bash
# Start the main development server (includes all microservices)
npm run dev:all-services

<<<<<<< HEAD
# Or start just the autonomous-investigation microservice
npm run dev:autonomous-investigation
=======
# Or start just the structured-investigation microservice
npm run dev:structured-investigation
>>>>>>> 001-modify-analyzer-method
```

### 2. Access Development Environment

- **Main Shell**: http://localhost:3000
<<<<<<< HEAD
- **Autonomous Investigation**: http://localhost:3001
=======
- **Structured Investigation**: http://localhost:3001
>>>>>>> 001-modify-analyzer-method
- **API Documentation**: http://localhost:8090/docs

### 3. Development Best Practices

#### Code Organization
```
<<<<<<< HEAD
src/microservices/autonomous-investigation/
=======
src/microservices/structured-investigation/
>>>>>>> 001-modify-analyzer-method
├── components/
│   ├── power-grid/           # Power Grid concept components
│   ├── command-center/       # Command Center concept components
│   ├── evidence-trail/       # Evidence Trail concept components
│   ├── network-explorer/     # Network Explorer concept components
│   └── shared/               # Shared components across concepts
│       ├── graph/            # Graph visualization components
│       ├── timeline/         # Timeline components
│       ├── evidence/         # Evidence display components
│       └── export/           # Export functionality
├── hooks/                    # Custom React hooks
├── stores/                   # Zustand stores for local state
├── types/                    # TypeScript type definitions
├── utils/                    # Utility functions
└── assets/                   # Static assets
```

#### Component Development Pattern
```typescript
// Example component structure
import React from 'react';
import { useInvestigation } from '../../hooks/useInvestigation';
import { Card, Button } from '@/components/ui';

interface Props {
  investigationId: string;
  onSelect?: (id: string) => void;
}

export const ComponentName: React.FC<Props> = ({ investigationId, onSelect }) => {
  const { data: investigation, isLoading, error } = useInvestigation(investigationId);

  if (isLoading) return <ComponentSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!investigation) return <EmptyState />;

  return (
    <Card className="p-4">
      {/* Component content */}
    </Card>
  );
};

// Always include loading, error, and empty states
const ComponentSkeleton = () => (
  <div className="animate-pulse">
    {/* Skeleton content */}
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <div className="text-red-600 p-4">
    Error: {error.message}
  </div>
);

const EmptyState = () => (
  <div className="text-gray-500 p-4 text-center">
    No data available
  </div>
);
```

### 4. Testing Setup

#### Component Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

#### Example Test
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComponentName } from './ComponentName';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

test('renders investigation data correctly', async () => {
  const queryClient = createTestQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <ComponentName investigationId="INV-123" />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(screen.getByText(/investigation/i)).toBeInTheDocument();
  });
});
```

## Mock Data for Development

### 1. Create Mock Data Files

<<<<<<< HEAD
Create `src/microservices/autonomous-investigation/utils/mockData.ts`:
=======
Create `src/microservices/structured-investigation/utils/mockData.ts`:
>>>>>>> 001-modify-analyzer-method

```typescript
import type { Investigation, Evidence, TimelineEvent } from '../types';

export const mockInvestigation: Investigation = {
  id: "INV-123",
  entity: {
    type: "ip",
    value: "95.211.35.146"
  },
  time_window: {
    start: "2025-01-21T10:00:00Z",
    end: "2025-01-23T10:00:00Z",
    duration_hours: 48
  },
  current_phase: "analysis",
  status: "running",
  priority: "medium",
  confidence: 0.78,
  quality_score: 0.85,
  risk_score: 0.85,
  risk_progression: [
    {
      timestamp: "2025-01-21T10:00:00Z",
      score: 0.0,
      source: "initialization",
      reason: "Investigation started",
      confidence: 1.0,
      evidence_count: 0
    },
    {
      timestamp: "2025-01-21T11:30:00Z",
      score: 0.75,
      source: "network_agent",
      reason: "Geographic anomaly detected",
      confidence: 0.85,
      evidence_count: 3
    }
  ],
  created_by: "user_123",
  assigned_to: ["user_123"],
  created_at: "2025-01-21T09:00:00Z",
  updated_at: "2025-01-21T12:00:00Z"
};

// Add more mock data as needed...
```

### 2. Environment Configuration

Create `.env.development.local`:

```bash
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8090/api/v1
REACT_APP_WS_URL=ws://localhost:8090/ws

# Feature Flags
REACT_APP_ENABLE_MOCK_DATA=true
REACT_APP_ENABLE_DEBUG_LOGS=true
REACT_APP_GRAPH_DEBUG_MODE=true

# Performance
REACT_APP_BUNDLE_ANALYZER=false
REACT_APP_SOURCE_MAPS=true
```

## Debugging and Troubleshooting

### Common Issues

1. **Bundle Size Exceeded**
   ```bash
   # Analyze bundle size
   npm run build
   npm run analyze

   # Fix: Use dynamic imports for heavy components
   const NetworkExplorer = lazy(() => import('./NetworkExplorerConcept'));
   ```

2. **WebSocket Connection Issues**
   - Check CORS settings in backend
   - Verify JWT token format
   - Use browser dev tools Network tab

3. **Graph Performance Issues**
   - Enable React DevTools Profiler
   - Check for unnecessary re-renders
   - Implement proper memoization

### Development Tools

```bash
# Bundle analysis
npm run build && npm run analyze

# Performance monitoring
npm run dev -- --profile

# Accessibility testing
npm run test:a11y

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

## Next Steps

1. **Implement First Concept**: Start with Power Grid concept as it establishes patterns
2. **Set Up Testing**: Create comprehensive test suite for components
3. **Performance Monitoring**: Implement bundle size and performance monitoring
4. **Accessibility Testing**: Set up automated accessibility testing
5. **Documentation**: Document component APIs and usage patterns

## Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [D3.js Documentation](https://d3js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

This quickstart guide provides a solid foundation for developing the Hybrid Graph Investigation UI. Follow the patterns established here for consistent, maintainable code across all 4 UI concepts.