import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CombinedAutonomousInvestigationDisplay } from '../CombinedAutonomousInvestigationDisplay';

// Create test data that matches the expected interfaces
const createTestData = () => ({
  investigationId: 'test-investigation-123',
  isActive: false,
  agents: [
    {
      id: 'orchestrator-1',
      name: 'Orchestrator',
      type: 'orchestrator' as const,
      position: { x: 400, y: 50 },
      status: 'idle' as const,
      confidence: 0.95
    },
    {
      id: 'network-1',
      name: 'Network Agent',
      type: 'network' as const,
      position: { x: 150, y: 200 },
      status: 'idle' as const
    },
    {
      id: 'risk-1',
      name: 'Risk Agent',
      type: 'risk' as const,
      position: { x: 400, y: 350 },
      status: 'idle' as const
    }
  ],
  connections: [
    {
      id: 'conn-1',
      fromNodeId: 'orchestrator-1',
      toNodeId: 'network-1',
      status: 'idle' as const
    },
    {
      id: 'conn-2',
      fromNodeId: 'orchestrator-1',
      toNodeId: 'risk-1',
      status: 'idle' as const
    }
  ],
  investigationFlow: {
    nodes: [
      {
        id: 'start',
        name: 'Start Investigation',
        type: 'start' as const,
        position: { x: 100, y: 100 },
        status: 'completed' as const,
        phase: 'initialization'
      },
      {
        id: 'network-analysis',
        name: 'Network Analysis',
        type: 'agent' as const,
        position: { x: 300, y: 100 },
        status: 'idle' as const,
        phase: 'network_analysis'
      },
      {
        id: 'result',
        name: 'Final Result',
        type: 'result' as const,
        position: { x: 500, y: 100 },
        status: 'idle' as const,
        phase: 'completion'
      }
    ],
    edges: [
      {
        id: 'edge-1',
        fromNodeId: 'start',
        toNodeId: 'network-analysis',
        status: 'completed' as const
      },
      {
        id: 'edge-2',
        fromNodeId: 'network-analysis',
        toNodeId: 'result',
        status: 'idle' as const
      }
    ],
    progress: 0.2,
    currentPhase: 'network_analysis'
  },
  logs: [
    {
      id: 'log-1',
      timestamp: '2025-09-04T20:00:00.000Z',
      type: 'info' as const,
      message: 'Investigation initialized successfully',
      agent: 'ORCHESTRATOR'
    },
    {
      id: 'log-2',
      timestamp: '2025-09-04T20:00:05.000Z',
      type: 'success' as const,
      message: 'All agents ready for deployment',
      agent: 'ORCHESTRATOR'
    }
  ]
});

// Mock the child components to avoid dependency issues
jest.mock('../neural-network/NeuralNetworkFlow', () => {
  return {
    NeuralNetworkFlow: ({ agents, connections, onNodeClick, onConnectionClick }: any) => {
      return (
        <div data-testid="neural-network-flow">
          <div>Neural Network Flow</div>
          <div>Agents: {agents.length}</div>
          <div>Connections: {connections.length}</div>
          {agents.map((agent: any) => (
            <button 
              key={agent.id} 
              data-testid={`agent-${agent.id}`}
              onClick={() => onNodeClick?.(agent.id, agent)}
            >
              {agent.name}
            </button>
          ))}
        </div>
      );
    }
  };
});

jest.mock('../interactive-graph/InteractiveInvestigationGraph', () => {
  return {
    InteractiveInvestigationGraph: ({ investigationFlow, onGraphInteraction }: any) => {
      return (
        <div data-testid="interactive-investigation-graph">
          <div>Interactive Investigation Graph</div>
          <div>Progress: {Math.round((investigationFlow.progress || 0) * 100)}%</div>
          <div>Phase: {investigationFlow.currentPhase || 'none'}</div>
          <div>Nodes: {investigationFlow.nodes.length}</div>
          <button 
            data-testid="graph-interact"
            onClick={() => onGraphInteraction?.({ type: 'node_click', nodeId: 'test' })}
          >
            Interact
          </button>
        </div>
      );
    }
  };
});

jest.mock('../command-terminal/CommandTerminal', () => {
  return {
    CommandTerminal: ({ logs, onTerminalCommand }: any) => {
      return (
        <div data-testid="command-terminal">
          <div>Command Terminal</div>
          <div>Log Count: {logs.length}</div>
          {logs.map((log: any) => (
            <div key={log.id} data-testid={`log-${log.id}`}>
              [{log.type.toUpperCase()}] {log.message}
            </div>
          ))}
          <button 
            data-testid="terminal-command"
            onClick={() => onTerminalCommand?.('test command')}
          >
            Send Command
          </button>
        </div>
      );
    }
  };
});

// Mock the WebSocket integration hook to avoid actual network calls
jest.mock('../hooks/useWebSocketIntegration', () => {
  return {
    useWebSocketIntegration: () => ({
      isConnected: false,
      client: null,
      reconnect: jest.fn(),
      disconnect: jest.fn(),
      investigationId: 'test-investigation-123',
      connectionAttempts: 0
    })
  };
});

describe('Combined Autonomous Investigation Display - Basic Integration', () => {
  let testData: any;

  beforeEach(() => {
    testData = createTestData();
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders all main sections', () => {
      render(<CombinedAutonomousInvestigationDisplay {...testData} />);

      // Header
      expect(screen.getByText('Autonomous Investigation Command Center')).toBeInTheDocument();
      expect(screen.getByText('Real-time AI agent coordination and investigation monitoring')).toBeInTheDocument();
      
      // Investigation ID
      expect(screen.getByText('Investigation ID: test-investigation-123')).toBeInTheDocument();
      
      // Main components
      expect(screen.getByTestId('neural-network-flow')).toBeInTheDocument();
      expect(screen.getByTestId('interactive-investigation-graph')).toBeInTheDocument();
      expect(screen.getByTestId('command-terminal')).toBeInTheDocument();
    });

    test('renders component titles and descriptions', () => {
      render(<CombinedAutonomousInvestigationDisplay {...testData} />);

      // Neural Network section
      expect(screen.getByText('Neural Network Flow')).toBeInTheDocument();
      expect(screen.getByText('AI agent coordination with real-time data flow')).toBeInTheDocument();
      
      // Interactive Graph section
      expect(screen.getByText('Interactive Graph')).toBeInTheDocument();
      expect(screen.getByText('3D investigation flow with WebSocket updates')).toBeInTheDocument();
      
      // Command Terminal section
      expect(screen.getByText('Command Terminal')).toBeInTheDocument();
      expect(screen.getByText('Live investigation logs with typewriter effect')).toBeInTheDocument();
    });

    test('passes correct props to child components', () => {
      render(<CombinedAutonomousInvestigationDisplay {...testData} />);

      // Neural Network should show agent and connection counts
      expect(screen.getByText('Agents: 3')).toBeInTheDocument();
      expect(screen.getByText('Connections: 2')).toBeInTheDocument();
      
      // Interactive Graph should show progress and phase
      expect(screen.getByText('Progress: 20%')).toBeInTheDocument();
      expect(screen.getByText('Phase: network_analysis')).toBeInTheDocument();
      expect(screen.getByText('Nodes: 3')).toBeInTheDocument();
      
      // Command Terminal should show logs
      expect(screen.getByText('Log Count: 2')).toBeInTheDocument();
      expect(screen.getByTestId('log-log-1')).toBeInTheDocument();
      expect(screen.getByTestId('log-log-2')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    test('shows standby status when inactive', () => {
      render(<CombinedAutonomousInvestigationDisplay {...testData} />);
      
      expect(screen.getByText('Standby')).toBeInTheDocument();
    });

    test('shows connecting status when active but not connected', () => {
      const activeData = { ...testData, isActive: true };
      render(<CombinedAutonomousInvestigationDisplay {...activeData} />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    test('displays progress information correctly', () => {
      render(<CombinedAutonomousInvestigationDisplay {...testData} />);
      
      // Should show progress percentage in the Interactive Graph section header
      const progressElement = screen.getByText('Progress: 20%');
      expect(progressElement).toBeInTheDocument();
    });
  });

  describe('Animation Controls', () => {
    test('renders animation speed controls', () => {
      render(<CombinedAutonomousInvestigationDisplay {...testData} />);
      
      expect(screen.getByText('Animation Speed:')).toBeInTheDocument();
      expect(screen.getByText('Slow')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Fast')).toBeInTheDocument();
    });

    test('animation speed buttons are interactive', () => {
      render(<CombinedAutonomousInvestigationDisplay {...testData} />);
      
      const fastButton = screen.getByText('Fast');
      const slowButton = screen.getByText('Slow');
      
      // Initially normal should be selected
      const normalButton = screen.getByText('Normal');
      expect(normalButton).toHaveClass('bg-blue-500');
      
      // Clicking fast should change selection
      fireEvent.click(fastButton);
      expect(fastButton).toHaveClass('bg-blue-500');
      expect(normalButton).not.toHaveClass('bg-blue-500');
      
      // Clicking slow should change selection
      fireEvent.click(slowButton);
      expect(slowButton).toHaveClass('bg-blue-500');
      expect(fastButton).not.toHaveClass('bg-blue-500');
    });
  });

  describe('Component Interactions', () => {
    test('handles component interaction callbacks', () => {
      const onInteraction = jest.fn();
      render(
        <CombinedAutonomousInvestigationDisplay 
          {...testData} 
          onComponentInteraction={onInteraction}
        />
      );

      // Test neural network interaction
      const agentButton = screen.getByTestId('agent-orchestrator-1');
      fireEvent.click(agentButton);
      
      expect(onInteraction).toHaveBeenCalledWith(
        'neural-network',
        expect.objectContaining({ type: 'node_click' })
      );

      // Test interactive graph interaction
      const graphButton = screen.getByTestId('graph-interact');
      fireEvent.click(graphButton);
      
      expect(onInteraction).toHaveBeenCalledWith(
        'interactive-graph',
        expect.objectContaining({ type: 'node_click', nodeId: 'test' })
      );

      // Test terminal interaction
      const terminalButton = screen.getByTestId('terminal-command');
      fireEvent.click(terminalButton);
      
      expect(onInteraction).toHaveBeenCalledWith(
        'command-terminal',
        expect.objectContaining({ type: 'command', command: 'test command' })
      );
    });
  });

  describe('Data Updates', () => {
    test('updates when props change', () => {
      const { rerender } = render(<CombinedAutonomousInvestigationDisplay {...testData} />);
      
      // Update the data
      const updatedData = {
        ...testData,
        investigationFlow: {
          ...testData.investigationFlow,
          progress: 0.8,
          currentPhase: 'risk_assessment'
        }
      };
      
      rerender(<CombinedAutonomousInvestigationDisplay {...updatedData} />);
      
      // Should show updated progress and phase
      expect(screen.getByText('Progress: 80%')).toBeInTheDocument();
      expect(screen.getByText('Phase: risk_assessment')).toBeInTheDocument();
    });

    test('handles new logs correctly', () => {
      const { rerender } = render(<CombinedAutonomousInvestigationDisplay {...testData} />);
      
      const updatedData = {
        ...testData,
        logs: [
          ...testData.logs,
          {
            id: 'log-3',
            timestamp: '2025-09-04T20:00:10.000Z',
            type: 'warning' as const,
            message: 'New warning message',
            agent: 'RISK_AGENT'
          }
        ]
      };
      
      rerender(<CombinedAutonomousInvestigationDisplay {...updatedData} />);
      
      expect(screen.getByText('Log Count: 3')).toBeInTheDocument();
      expect(screen.getByTestId('log-log-3')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty data gracefully', () => {
      const emptyData = {
        investigationId: 'empty-test',
        isActive: false,
        agents: [],
        connections: [],
        investigationFlow: {
          nodes: [],
          edges: [],
          progress: 0,
          currentPhase: undefined
        },
        logs: []
      };
      
      expect(() => {
        render(<CombinedAutonomousInvestigationDisplay {...emptyData} />);
      }).not.toThrow();
      
      expect(screen.getByText('Agents: 0')).toBeInTheDocument();
      expect(screen.getByText('Connections: 0')).toBeInTheDocument();
      expect(screen.getByText('Nodes: 0')).toBeInTheDocument();
      expect(screen.getByText('Log Count: 0')).toBeInTheDocument();
    });

    test('handles missing optional props', () => {
      const minimalData = {
        investigationId: 'minimal-test',
        isActive: false,
        agents: testData.agents,
        connections: testData.connections,
        investigationFlow: testData.investigationFlow,
        logs: testData.logs
      };
      
      expect(() => {
        render(<CombinedAutonomousInvestigationDisplay {...minimalData} />);
      }).not.toThrow();
    });

    test('handles component unmounting cleanly', () => {
      const { unmount } = render(<CombinedAutonomousInvestigationDisplay {...testData} />);
      
      expect(() => unmount()).not.toThrow();
    });
  });
});
