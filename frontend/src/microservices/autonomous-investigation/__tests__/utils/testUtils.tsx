import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Investigation, InvestigationStatus, AgentProgress } from '../../types/investigation';

// Re-export screen for convenience
import { screen } from '@testing-library/react';

// Test providers wrapper
interface TestProvidersProps {
  children: React.ReactNode;
  initialEntries?: string[];
}

const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  initialEntries = ['/']
}) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
};

// Enhanced render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders initialEntries={initialEntries}>
        {children}
      </TestProviders>
    ),
    ...renderOptions,
  });
};

// Test data factory functions
export const createMockInvestigation = (overrides: Partial<Investigation> = {}): Investigation => {
  const defaultInvestigation: Investigation = {
    id: 'test-inv-123',
    title: 'Test Investigation',
    description: 'A test investigation for unit testing',
    status: 'pending' as InvestigationStatus,
    priority: 'medium',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user@example.com',
    assignedAgents: ['test-agent-1', 'test-agent-2'],
    configuration: {
      parameters: {
        parallelAgents: true,
        timeRange: '24h',
        threshold: 0.75
      }
    },
    progress: {
      overall: 0,
      agents: []
    }
  };

  return { ...defaultInvestigation, ...overrides };
};

export const createMockAgent = (overrides: Partial<AgentProgress> = {}): AgentProgress => {
  const defaultAgent: AgentProgress = {
    agentId: 'test-agent-1',
    status: 'pending',
    progress: 0,
    message: 'Agent initialized'
  };

  return { ...defaultAgent, ...overrides };
};

export const createRunningInvestigation = (progressPercent: number = 50): Investigation => {
  return createMockInvestigation({
    status: 'running',
    startedAt: '2024-01-01T01:00:00Z',
    progress: {
      overall: progressPercent,
      agents: [
        createMockAgent({
          agentId: 'agent-1',
          status: 'running',
          progress: progressPercent + 10,
          message: 'Processing data...'
        }),
        createMockAgent({
          agentId: 'agent-2',
          status: 'running',
          progress: progressPercent - 10,
          message: 'Analyzing patterns...'
        })
      ]
    }
  });
};

export const createCompletedInvestigation = (): Investigation => {
  return createMockInvestigation({
    status: 'completed',
    startedAt: '2024-01-01T01:00:00Z',
    completedAt: '2024-01-01T02:00:00Z',
    progress: {
      overall: 100,
      agents: [
        createMockAgent({
          agentId: 'agent-1',
          status: 'completed',
          progress: 100,
          message: 'Analysis complete'
        }),
        createMockAgent({
          agentId: 'agent-2',
          status: 'completed',
          progress: 100,
          message: 'Investigation finished'
        })
      ]
    },
    results: {
      riskScore: 0.75,
      confidence: 0.88,
      summary: 'Medium risk investigation completed successfully',
      findings: [
        'Suspicious transaction pattern detected',
        'Multiple failed authentication attempts',
        'Geographic location anomaly'
      ],
      recommendations: [
        'Implement additional authentication factors',
        'Monitor account for 30 days',
        'Review transaction history'
      ],
      agentResults: [
        {
          agentId: 'agent-1',
          status: 'completed',
          score: 80,
          confidence: 85,
          executionTime: 2500,
          findings: ['Transaction pattern anomaly'],
          evidence: [
            {
              id: 'evidence-1',
              type: 'pattern',
              title: 'Transaction Anomaly',
              description: 'Unusual spending pattern detected',
              severity: 'medium',
              confidence: 80,
              source: 'agent-1',
              timestamp: '2024-01-01T01:30:00Z',
              data: { anomaly_score: 0.8 }
            }
          ],
          resourceUsage: {
            cpu: 45,
            memory: 128
          }
        },
        {
          agentId: 'agent-2',
          status: 'completed',
          score: 70,
          confidence: 90,
          executionTime: 3000,
          findings: ['Authentication failure pattern'],
          evidence: [
            {
              id: 'evidence-2',
              type: 'log',
              title: 'Failed Login Attempts',
              description: 'Multiple failed authentication attempts',
              severity: 'high',
              confidence: 90,
              source: 'agent-2',
              timestamp: '2024-01-01T01:45:00Z',
              data: { failed_attempts: 15 }
            }
          ],
          resourceUsage: {
            cpu: 60,
            memory: 256
          }
        }
      ],
      artifacts: [
        {
          id: 'artifact-1',
          type: 'log',
          title: 'Authentication Logs',
          description: 'Failed authentication attempts log',
          createdAt: '2024-01-01T01:00:00Z',
          data: { total_entries: 150, failed_entries: 15 }
        },
        {
          id: 'artifact-2',
          type: 'transaction',
          title: 'Transaction Records',
          description: 'Suspicious transaction records',
          createdAt: '2024-01-01T01:15:00Z',
          data: { total_transactions: 50, flagged_transactions: 8 }
        }
      ],
      timeline: [
        {
          timestamp: '2024-01-01T01:00:00Z',
          type: 'start',
          description: 'Investigation started',
          actor: 'System',
          metadata: { trigger: 'automated', priority: 'medium' }
        },
        {
          timestamp: '2024-01-01T01:15:00Z',
          type: 'agent_start',
          description: 'Agent 1 started analysis',
          actor: 'agent-1',
          metadata: { task: 'transaction_analysis' }
        },
        {
          timestamp: '2024-01-01T01:20:00Z',
          type: 'agent_start',
          description: 'Agent 2 started analysis',
          actor: 'agent-2',
          metadata: { task: 'auth_analysis' }
        },
        {
          timestamp: '2024-01-01T01:45:00Z',
          type: 'finding',
          description: 'Suspicious pattern detected',
          actor: 'agent-1',
          metadata: { confidence: 0.8, type: 'transaction_anomaly' }
        },
        {
          timestamp: '2024-01-01T02:00:00Z',
          type: 'complete',
          description: 'Investigation completed',
          actor: 'System',
          metadata: { duration: '1h', final_score: 0.75 }
        }
      ]
    }
  });
};

export const createFailedInvestigation = (): Investigation => {
  return createMockInvestigation({
    status: 'failed',
    startedAt: '2024-01-01T01:00:00Z',
    progress: {
      overall: 25,
      agents: [
        createMockAgent({
          agentId: 'agent-1',
          status: 'failed',
          progress: 25,
          message: 'Connection timeout',
          error: 'Failed to connect to data source'
        }),
        createMockAgent({
          agentId: 'agent-2',
          status: 'pending',
          progress: 0,
          message: 'Waiting for agent-1 to complete'
        })
      ]
    }
  });
};

// Mock handlers factory
export const createMockHandlers = () => ({
  onRefresh: jest.fn(),
  onCreateInvestigation: jest.fn(),
  onViewInvestigation: jest.fn(),
  onStartInvestigation: jest.fn(),
  onPauseInvestigation: jest.fn(),
  onResumeInvestigation: jest.fn(),
  onStopInvestigation: jest.fn(),
  onDeleteInvestigation: jest.fn(),
  onBack: jest.fn(),
  onExport: jest.fn()
});

// Test assertion helpers
export const expectInvestigationStatus = (status: InvestigationStatus) => {
  const statusText = status.toUpperCase();
  return expect(screen.getByText(statusText)).toBeInTheDocument();
};

export const expectProgressPercentage = (percentage: number) => {
  return expect(screen.getByText(`${percentage}%`)).toBeInTheDocument();
};

export const expectAgentCount = (count: number) => {
  const text = count === 1 ? '1 agent' : `${count} agents`;
  return expect(screen.getByText(text)).toBeInTheDocument();
};

// Async test helpers
export const waitForInvestigationUpdate = async (timeout: number = 1000) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export const mockAsyncOperation = (delay: number = 100, shouldFail: boolean = false) => {
  return jest.fn(() =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error('Operation failed'));
        } else {
          resolve(undefined);
        }
      }, delay);
    })
  );
};

// Date helpers for testing
export const mockDateNow = (timestamp: string) => {
  const mockDate = new Date(timestamp);
  jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
  return mockDate;
};

export const restoreDateNow = () => {
  jest.restoreAllMocks();
};

// Local storage mock helpers
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    get length() {
      return Object.keys(storage).length;
    },
    key: jest.fn((index: number) => Object.keys(storage)[index] || null)
  };
};

// Export everything including the custom render
export * from '@testing-library/react';
export { customRender as render };
export { screen };