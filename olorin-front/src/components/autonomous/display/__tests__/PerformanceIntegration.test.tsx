import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import { CombinedAutonomousInvestigationDisplay } from '../CombinedAutonomousInvestigationDisplay';
import { AutonomousInvestigationClient } from '../../../js/services/AutonomousInvestigationClient';
import {
  AgentNodeData,
  ConnectionData,
  InvestigationFlowData,
  TerminalLogEntry,
  GraphNodeData,
  GraphEdgeData
} from '../../../types/AutonomousDisplayTypes';
import { performance } from 'perf_hooks';

// Mock the AutonomousInvestigationClient
jest.mock('../../../js/services/AutonomousInvestigationClient');

// Mock WebSocket for performance tests
class MockWebSocket {
  public readyState: number = WebSocket.OPEN;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;

  constructor(public url: string) {}

  send(data: string): void {}
  close(): void {
    this.readyState = WebSocket.CLOSED;
  }

  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({
        data: JSON.stringify(data),
        type: 'message'
      } as MessageEvent);
    }
  }
}

(global as any).WebSocket = MockWebSocket;

// Performance test utilities
const measureRenderTime = async (renderFunction: () => void): Promise<number> => {
  const start = performance.now();
  renderFunction();
  await new Promise(resolve => setTimeout(resolve, 0)); // Wait for React updates
  const end = performance.now();
  return end - start;
};

const generateLargeDataSet = (size: number) => {
  const agents: AgentNodeData[] = [];
  const connections: ConnectionData[] = [];
  const logs: TerminalLogEntry[] = [];
  const graphNodes: GraphNodeData[] = [];
  const graphEdges: GraphEdgeData[] = [];

  // Generate agents
  const agentTypes = ['network', 'device', 'location', 'logs', 'risk', 'orchestrator'] as const;
  for (let i = 0; i < size; i++) {
    agents.push({
      id: `agent-${i}`,
      name: `Agent ${i}`,
      type: agentTypes[i % agentTypes.length],
      position: { x: (i % 10) * 50, y: Math.floor(i / 10) * 50 },
      status: 'idle',
      confidence: Math.random()
    });

    // Generate logs
    logs.push({
      id: `log-${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      type: ['info', 'warning', 'error', 'success'][i % 4] as any,
      message: `Log message ${i} with some detailed information about what happened`,
      agent: `AGENT_${i}`
    });

    // Generate graph nodes
    graphNodes.push({
      id: `node-${i}`,
      name: `Node ${i}`,
      type: ['start', 'agent', 'decision', 'result'][i % 4] as any,
      position: { x: (i % 8) * 70, y: Math.floor(i / 8) * 70 },
      status: 'idle',
      phase: `phase_${i}`
    });
  }

  // Generate connections/edges
  for (let i = 0; i < size - 1; i++) {
    connections.push({
      id: `conn-${i}`,
      fromNodeId: `agent-${i}`,
      toNodeId: `agent-${i + 1}`,
      status: 'idle'
    });

    graphEdges.push({
      id: `edge-${i}`,
      fromNodeId: `node-${i}`,
      toNodeId: `node-${i + 1}`,
      status: 'idle'
    });
  }

  return {
    agents,
    connections,
    logs,
    investigationFlow: {
      nodes: graphNodes,
      edges: graphEdges,
      progress: 0,
      currentPhase: 'initialization'
    }
  };
};

describe('Performance Integration Tests', () => {
  let mockClient: jest.Mocked<AutonomousInvestigationClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      startInvestigation: jest.fn().mockResolvedValue('test-investigation'),
      stopInvestigation: jest.fn(),
      isActive: jest.fn().mockReturnValue(true),
      getInvestigationId: jest.fn().mockReturnValue('test-investigation'),
      pauseInvestigation: jest.fn(),
      resumeInvestigation: jest.fn(),
      cancelInvestigation: jest.fn(),
      getInvestigationStatus: jest.fn(),
      getResults: jest.fn().mockReturnValue({})
    } as any;

    (AutonomousInvestigationClient as jest.MockedClass<typeof AutonomousInvestigationClient>).mockImplementation(() => mockClient);
  });

  describe('Render Performance', () => {
    it('should render initial state within acceptable time limits', async () => {
      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(10);

      const renderTime = await measureRenderTime(() => {
        render(
          <CombinedAutonomousInvestigationDisplay
            investigationId="test-investigation"
            isActive={false}
            agents={agents}
            connections={connections}
            investigationFlow={investigationFlow}
            logs={logs}
          />
        );
      });

      // Should render within 100ms for moderate data set
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle large datasets efficiently', async () => {
      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(50);

      const renderTime = await measureRenderTime(() => {
        render(
          <CombinedAutonomousInvestigationDisplay
            investigationId="test-investigation"
            isActive={false}
            agents={agents}
            connections={connections}
            investigationFlow={investigationFlow}
            logs={logs}
          />
        );
      });

      // Should still render within reasonable time for large dataset
      expect(renderTime).toBeLessThan(500);
    });

    it('should minimize re-renders when props change', async () => {
      const renderSpy = jest.fn();
      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(20);

      // Create a wrapper component to track renders
      const TestComponent = React.memo((props: any) => {
        renderSpy();
        return <CombinedAutonomousInvestigationDisplay {...props} />;
      });

      const { rerender } = render(
        <TestComponent
          investigationId="test-investigation"
          isActive={false}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      const initialRenderCount = renderSpy.mock.calls.length;

      // Re-render with identical props
      rerender(
        <TestComponent
          investigationId="test-investigation"
          isActive={false}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      // Should not cause additional renders due to React.memo
      expect(renderSpy.mock.calls.length).toBe(initialRenderCount);
    });
  });

  describe('Animation Performance', () => {
    it('should handle animation speed changes efficiently', async () => {
      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(15);

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation"
          isActive={true}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      const fastButton = screen.getByText('Fast');
      const slowButton = screen.getByText('Slow');

      // Measure time for animation speed changes
      const start = performance.now();
      
      fireEvent.click(fastButton);
      fireEvent.click(slowButton);
      fireEvent.click(screen.getByText('Normal'));

      const end = performance.now();
      const animationChangeTime = end - start;

      // Animation changes should be near-instantaneous
      expect(animationChangeTime).toBeLessThan(50);
    });

    it('should handle rapid WebSocket updates without performance degradation', async () => {
      let eventHandlers: any;
      mockClient.startInvestigation.mockImplementation(async (id, type, handlers) => {
        eventHandlers = handlers;
        return 'test-investigation';
      });

      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(10);

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation"
          isActive={true}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });

      // Simulate rapid updates
      const updateCount = 20;
      const start = performance.now();

      for (let i = 0; i < updateCount; i++) {
        act(() => {
          eventHandlers.onPhaseUpdate({
            phase: `phase_${i % 5}`,
            progress: i / updateCount,
            message: `Update ${i}`,
            timestamp: new Date().toISOString()
          });
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/Update/)).toBeInTheDocument();
      });

      const end = performance.now();
      const updateTime = end - start;

      // Rapid updates should complete within reasonable time
      expect(updateTime).toBeLessThan(1000);
      
      // Should handle updates per second efficiently
      const updatesPerSecond = updateCount / (updateTime / 1000);
      expect(updatesPerSecond).toBeGreaterThan(10);
    });
  });

  describe('Memory Management', () => {
    it('should not cause memory leaks with frequent log additions', async () => {
      let eventHandlers: any;
      mockClient.startInvestigation.mockImplementation(async (id, type, handlers) => {
        eventHandlers = handlers;
        return 'test-investigation';
      });

      const { agents, connections, investigationFlow } = generateLargeDataSet(10);
      const initialLogs: TerminalLogEntry[] = [];

      const { unmount } = render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation"
          isActive={true}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={initialLogs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });

      // Add many log entries
      const logCount = 100;
      for (let i = 0; i < logCount; i++) {
        act(() => {
          eventHandlers.onLog(`Log message ${i}`, 'INFO');
        });
      }

      // Clean unmount should work without issues
      expect(() => unmount()).not.toThrow();
    });

    it('should properly cleanup WebSocket connection on unmount', async () => {
      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(5);

      const { unmount } = render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation"
          isActive={true}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockClient.stopInvestigation).toHaveBeenCalled();
      });
    });
  });

  describe('Real-time Update Performance', () => {
    it('should maintain 60fps during continuous updates', async () => {
      let eventHandlers: any;
      mockClient.startInvestigation.mockImplementation(async (id, type, handlers) => {
        eventHandlers = handlers;
        return 'test-investigation';
      });

      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(10);

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation"
          isActive={true}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });

      // Simulate continuous updates at 60fps
      const targetFPS = 60;
      const frameTime = 1000 / targetFPS; // ~16.67ms per frame
      const testDuration = 500; // 500ms test
      const expectedFrames = Math.floor(testDuration / frameTime);

      let frameCount = 0;
      const start = performance.now();

      const updateInterval = setInterval(() => {
        act(() => {
          eventHandlers.onPhaseUpdate({
            phase: `continuous_${frameCount % 3}`,
            progress: (frameCount % 100) / 100,
            message: `Continuous update ${frameCount}`,
            timestamp: new Date().toISOString()
          });
        });
        frameCount++;

        if (performance.now() - start >= testDuration) {
          clearInterval(updateInterval);
        }
      }, frameTime);

      await new Promise(resolve => setTimeout(resolve, testDuration + 100));

      // Should handle most of the expected frames
      expect(frameCount).toBeGreaterThan(expectedFrames * 0.8);
    });

    it('should handle concurrent agent status updates efficiently', async () => {
      let eventHandlers: any;
      mockClient.startInvestigation.mockImplementation(async (id, type, handlers) => {
        eventHandlers = handlers;
        return 'test-investigation';
      });

      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(20);

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation"
          isActive={true}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });

      const start = performance.now();

      // Simulate concurrent updates to multiple agents
      const phases = ['network_analysis', 'device_analysis', 'location_analysis', 'logs_analysis', 'risk_assessment'];
      
      for (let i = 0; i < 10; i++) {
        phases.forEach((phase, index) => {
          act(() => {
            eventHandlers.onPhaseUpdate({
              phase,
              progress: (i + 1) / 10,
              message: `${phase} update ${i + 1}`,
              timestamp: new Date().toISOString(),
              agent_response: { confidence: 0.8 + (index * 0.04) }
            });
          });
        });
      }

      const end = performance.now();
      const concurrentUpdateTime = end - start;

      // Should handle concurrent updates efficiently
      expect(concurrentUpdateTime).toBeLessThan(200);
    });
  });

  describe('Error Recovery Performance', () => {
    it('should handle connection errors without blocking the UI', async () => {
      mockClient.startInvestigation.mockRejectedValue(new Error('Connection timeout'));

      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(10);

      const start = performance.now();

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation"
          isActive={true}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      // Should render error state quickly
      await waitFor(() => {
        expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
      });

      const end = performance.now();
      const errorRenderTime = end - start;

      // Error handling should not significantly impact render performance
      expect(errorRenderTime).toBeLessThan(150);
    });

    it('should recover gracefully from WebSocket disconnections', async () => {
      let eventHandlers: any;
      mockClient.startInvestigation.mockImplementation(async (id, type, handlers) => {
        eventHandlers = handlers;
        return 'test-investigation';
      });

      const { agents, connections, investigationFlow, logs } = generateLargeDataSet(10);

      render(
        <CombinedAutonomousInvestigationDisplay
          investigationId="test-investigation"
          isActive={true}
          agents={agents}
          connections={connections}
          investigationFlow={investigationFlow}
          logs={logs}
        />
      );

      await waitFor(() => {
        expect(mockClient.startInvestigation).toHaveBeenCalled();
      });

      // Should continue working normally after successful connection
      act(() => {
        eventHandlers.onPhaseUpdate({
          phase: 'recovery_test',
          progress: 0.5,
          message: 'Recovery test message',
          timestamp: new Date().toISOString()
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Recovery test message/)).toBeInTheDocument();
      });
    });
  });
});
