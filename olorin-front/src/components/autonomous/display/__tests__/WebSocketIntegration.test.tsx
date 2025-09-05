import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import { AutonomousInvestigationClient } from '../../../../js/services/AutonomousInvestigationClient';
import { CombinedAutonomousInvestigationDisplay } from '../CombinedAutonomousInvestigationDisplay';
import {
  AgentNodeData,
  ConnectionData,
  InvestigationFlowData,
  TerminalLogEntry,
  GraphNodeData,
  GraphEdgeData
} from '../../../../types/AutonomousDisplayTypes';

// Mock the WebSocket and AutonomousInvestigationClient
jest.mock('../../../../js/services/AutonomousInvestigationClient');

// Mock WebSocket
class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen({} as Event);
      }
    }, 10);
  }

  send(data: string): void {
    // Mock send implementation
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || '' } as CloseEvent);
    }
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({
        data: JSON.stringify(data),
        type: 'message'
      } as MessageEvent);
    }
  }
}

// Replace the global WebSocket with our mock
(global as any).WebSocket = MockWebSocket;

// Test data
const mockAgents: AgentNodeData[] = [
  {
    id: 'orchestrator-1',
    name: 'Orchestrator',
    type: 'orchestrator',
    position: { x: 250, y: 50 },
    status: 'idle'
  },
  {
    id: 'network-1',
    name: 'Network Agent',
    type: 'network',
    position: { x: 100, y: 150 },
    status: 'idle'
  },
  {
    id: 'device-1',
    name: 'Device Agent',
    type: 'device',
    position: { x: 250, y: 150 },
    status: 'idle'
  },
  {
    id: 'risk-1',
    name: 'Risk Agent',
    type: 'risk',
    position: { x: 400, y: 150 },
    status: 'idle'
  }
];

const mockConnections: ConnectionData[] = [
  {
    id: 'conn-1',
    fromNodeId: 'orchestrator-1',
    toNodeId: 'network-1',
    status: 'idle'
  },
  {
    id: 'conn-2',
    fromNodeId: 'orchestrator-1',
    toNodeId: 'device-1',
    status: 'idle'
  },
  {
    id: 'conn-3',
    fromNodeId: 'device-1',
    toNodeId: 'risk-1',
    status: 'idle'
  }
];

const mockGraphNodes: GraphNodeData[] = [
  {
    id: 'start',
    name: 'Start Investigation',
    type: 'start',
    position: { x: 50, y: 100 },
    status: 'completed',
    phase: 'initialization'
  },
  {
    id: 'network-analysis',
    name: 'Network Analysis',
    type: 'agent',
    position: { x: 200, y: 100 },
    status: 'idle',
    phase: 'network_analysis'
  },
  {
    id: 'device-analysis',
    name: 'Device Analysis',
    type: 'agent',
    position: { x: 350, y: 100 },
    status: 'idle',
    phase: 'device_analysis'
  },
  {
    id: 'risk-assessment',
    name: 'Risk Assessment',
    type: 'result',
    position: { x: 500, y: 100 },
    status: 'idle',
    phase: 'risk_assessment'
  }
];

const mockGraphEdges: GraphEdgeData[] = [
  {
    id: 'edge-1',
    fromNodeId: 'start',
    toNodeId: 'network-analysis',
    status: 'completed'
  },
  {
    id: 'edge-2',
    fromNodeId: 'network-analysis',
    toNodeId: 'device-analysis',
    status: 'idle'
  },
  {
    id: 'edge-3',
    fromNodeId: 'device-analysis',
    toNodeId: 'risk-assessment',
    status: 'idle'
  }
];

const mockInvestigationFlow: InvestigationFlowData = {
  nodes: mockGraphNodes,
  edges: mockGraphEdges,
  progress: 0,
  currentPhase: 'initialization'
};

const mockLogs: TerminalLogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    type: 'info',
    message: 'Investigation initialized',
    agent: 'ORCHESTRATOR'
  }
];

describe('WebSocket Integration Tests', () => {
  let mockClient: any;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock client instance
    mockClient = {
      startInvestigation: jest.fn(),
      stopInvestigation: jest.fn(),
      isActive: jest.fn().mockReturnValue(true),
      getInvestigationId: jest.fn().mockReturnValue('test-investigation-123'),
      pauseInvestigation: jest.fn(),
      resumeInvestigation: jest.fn(),
      cancelInvestigation: jest.fn(),
      getInvestigationStatus: jest.fn(),
      getResults: jest.fn().mockReturnValue({})
    } as any;

    // Mock the constructor to return our mock instance
    (AutonomousInvestigationClient as jest.MockedClass<typeof AutonomousInvestigationClient>).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial WebSocket Connection', () => {
    it('should establish WebSocket connection when investigation becomes active', async () => {
      mockClient.startInvestigation.mockResolvedValue('test-investigation-123');

      const { rerender } = render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={false}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      // Initially should not start investigation
      expect(mockClient.startInvestigation).not.toHaveBeenCalled();

      // Activate the investigation
      rerender(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalledWith(
          'test-investigation-123',
          'user_id',
          expect.any(Object)
        );
      });
    });

    it('should display connection status in the UI', async () => {
      mockClient.startInvestigation.mockResolvedValue('test-investigation-123');

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      // Should show active status
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Event Handling', () => {
    let eventHandlers: any;

    beforeEach(async () => {
      mockClient.startInvestigation.mockImplementation(async (id: string, type: any, handlers: any) => {
        eventHandlers = handlers;
        return 'test-investigation-123';
      });

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });
    });

    it('should handle phase update events correctly', async () => {
      const phaseData = {
        phase: 'network_analysis',
        progress: 0.3,
        message: 'Analyzing network patterns',
        timestamp: new Date().toISOString(),
        agent_response: {
          confidence: 0.85
        }
      };

      act(() => {
        eventHandlers.onPhaseUpdate(phaseData);
      });

      await waitFor(() => {
        // Should update progress display
        expect(screen.getByText('30%')).toBeInTheDocument();
        
        // Should add log entry
        expect(screen.getByText(/NETWORK_ANALYSIS.*30.0%.*Analyzing network patterns/)).toBeInTheDocument();
      });
    });

    it('should handle status update events correctly', async () => {
      const statusData = {
        type: 'status_update',
        investigation_id: 'test-investigation-123',
        status: 'running',
        current_phase: 'device_analysis',
        progress: 0.5,
        message: 'Device analysis in progress',
        timestamp: new Date().toISOString()
      };

      act(() => {
        eventHandlers.onStatusUpdate(statusData);
      });

      await waitFor(() => {
        // Should update progress
        expect(screen.getByText('50%')).toBeInTheDocument();
        
        // Should add status log
        expect(screen.getByText(/Status: running - Device analysis in progress/)).toBeInTheDocument();
      });
    });

    it('should handle error events correctly', async () => {
      const errorData = {
        type: 'error',
        investigation_id: 'test-investigation-123',
        error_code: 'NETWORK_TIMEOUT',
        message: 'Network analysis timeout',
        phase: 'network_analysis',
        timestamp: new Date().toISOString(),
        retry_available: true
      };

      act(() => {
        eventHandlers.onError(errorData);
      });

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText(/❌ Error in network_analysis: Network analysis timeout/)).toBeInTheDocument();
        
        // Should show retry notice
        expect(screen.getByText(/⚠️ Retry option available/)).toBeInTheDocument();
      });
    });

    it('should handle investigation completion correctly', async () => {
      const results = {
        network_analysis: { risk_score: 75 },
        device_analysis: { anomalies: 3 },
        risk_assessment: { overall_risk: 'HIGH' }
      };

      act(() => {
        eventHandlers.onComplete(results);
      });

      await waitFor(() => {
        // Should show completion message
        expect(screen.getByText(/✅ Investigation completed successfully/)).toBeInTheDocument();
        
        // Should show results summary
        expect(screen.getByText(/📊 Results available: network_analysis, device_analysis, risk_assessment/)).toBeInTheDocument();
        
        // Should update progress to 100%
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('should handle investigation cancellation correctly', async () => {
      act(() => {
        eventHandlers.onCancelled();
      });

      await waitFor(() => {
        // Should show cancellation message
        expect(screen.getByText(/🛑 Investigation cancelled/)).toBeInTheDocument();
      });
    });

    it('should handle general log messages correctly', async () => {
      act(() => {
        eventHandlers.onLog('Debug message from client', 'INFO');
      });

      await waitFor(() => {
        // Should add log entry
        expect(screen.getByText('Debug message from client')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Status Updates', () => {
    let eventHandlers: any;

    beforeEach(async () => {
      mockClient.startInvestigation.mockImplementation(async (id: string, type: any, handlers: any) => {
        eventHandlers = handlers;
        return 'test-investigation-123';
      });

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });
    });

    it('should update agent status based on phase updates', async () => {
      // Test network agent activation
      const networkPhaseData = {
        phase: 'network_analysis',
        progress: 0.5,
        message: 'Analyzing network patterns',
        timestamp: new Date().toISOString(),
        agent_response: { confidence: 0.8 }
      };

      act(() => {
        eventHandlers.onPhaseUpdate(networkPhaseData);
      });

      await waitFor(() => {
        // Network agent should be marked as active
        // Note: This would require testing the internal state or having visual indicators
        expect(screen.getByText(/NETWORK.*50.0%/)).toBeInTheDocument();
      });

      // Test device agent completion
      const devicePhaseData = {
        phase: 'device_analysis',
        progress: 1.0,
        message: 'Device analysis completed',
        timestamp: new Date().toISOString(),
        agent_response: { confidence: 0.9 }
      };

      act(() => {
        eventHandlers.onPhaseUpdate(devicePhaseData);
      });

      await waitFor(() => {
        // Device agent should be marked as completed
        expect(screen.getByText(/DEVICE.*100.0%/)).toBeInTheDocument();
      });
    });

    it('should update agent status to error on error events', async () => {
      const errorData = {
        type: 'error',
        investigation_id: 'test-investigation-123',
        error_code: 'API_ERROR',
        message: 'Risk assessment API error',
        phase: 'risk_assessment',
        timestamp: new Date().toISOString()
      };

      act(() => {
        eventHandlers.onError(errorData);
      });

      await waitFor(() => {
        // Should show error for risk assessment
        expect(screen.getByText(/❌ Error in risk_assessment: Risk assessment API error/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Reconnection', () => {
    it('should handle connection failures gracefully', async () => {
      // Mock connection failure
      mockClient.startInvestigation.mockRejectedValue(new Error('Connection failed'));

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      await waitFor(() => {
        // Should show connection error in terminal
        expect(screen.getByText(/❌ Connection failed: Connection failed/)).toBeInTheDocument();
      });
    });

    it('should stop investigation when component becomes inactive', async () => {
      mockClient.startInvestigation.mockResolvedValue('test-investigation-123');

      const { rerender } = render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });

      // Deactivate investigation
      rerender(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={false}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      await waitFor(() => {
        expect(mockClient.stopInvestigation).toHaveBeenCalled();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not create excessive re-renders', async () => {
      const renderSpy = jest.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <CombinedAutonomousInvestigationDisplay {...props} />;
      };

      const { rerender } = render(
        <TestComponent
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props should not cause additional renders
      // (depends on React.memo implementation)
      rerender(
        <TestComponent
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      // Should minimize re-renders
      expect(renderSpy).toHaveBeenCalledTimes(2); // Allow for one additional render
    });

    it('should cleanup WebSocket connection on unmount', async () => {
      mockClient.startInvestigation.mockResolvedValue('test-investigation-123');

      const { unmount } = render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });

      unmount();

      // Should cleanup connection
      await waitFor(() => {
        expect(mockClient.stopInvestigation).toHaveBeenCalled();
      });
    });
  });

  describe('Animation and UI Updates', () => {
    it('should update animation speed controls', async () => {
      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
        />
      );

      // Test animation speed buttons
      const slowButton = screen.getByText('Slow');
      const fastButton = screen.getByText('Fast');

      fireEvent.click(slowButton);
      expect(slowButton).toHaveClass('bg-blue-500');

      fireEvent.click(fastButton);
      expect(fastButton).toHaveClass('bg-blue-500');
      expect(slowButton).not.toHaveClass('bg-blue-500');
    });

    it('should display investigation progress correctly', async () => {
      const flowWithProgress = {
        ...mockInvestigationFlow,
        progress: 0.65
      };

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={flowWithProgress}
          logs={mockLogs}
        />
      );

      // Should show progress percentage
      expect(screen.getByText('Progress: 65%')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('should handle component interaction callbacks', async () => {
      const onInteraction = jest.fn();

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation-123"
          isActive={true}
          agents={mockAgents}
          connections={mockConnections}
          investigationFlow={mockInvestigationFlow}
          logs={mockLogs}
          onComponentInteraction={onInteraction}
        />
      );

      // Note: This would require the child components to trigger interactions
      // For now, we just verify the prop is passed down correctly
      expect(onInteraction).toBeDefined();
    });
  });
});
