import React from 'react';
import { render, screen } from '@testing-library/react';
import { CombinedAutonomousInvestigationDisplay } from '../CombinedAutonomousInvestigationDisplay';

// Mock the child components since we only want to test the integration
jest.mock('../neural-network/NeuralNetworkFlow', () => ({
  NeuralNetworkFlow: () => <div data-testid="neural-network">Neural Network</div>
}));

jest.mock('../interactive-graph/InteractiveInvestigationGraph', () => ({
  InteractiveInvestigationGraph: () => <div data-testid="interactive-graph">Interactive Graph</div>
}));

jest.mock('../command-terminal/CommandTerminal', () => ({
  CommandTerminal: () => <div data-testid="command-terminal">Command Terminal</div>
}));

// Mock the WebSocket client
jest.mock('../../../js/services/AutonomousInvestigationClient', () => ({
  AutonomousInvestigationClient: jest.fn().mockImplementation(() => ({
    startInvestigation: jest.fn().mockResolvedValue('test-investigation'),
    stopInvestigation: jest.fn(),
    isActive: jest.fn().mockReturnValue(false),
    getInvestigationId: jest.fn().mockReturnValue(null)
  }))
}));

// Test data
const mockProps = {
  investigationId: 'test-investigation-123',
  isActive: false,
  agents: [
    {
      id: 'agent-1',
      name: 'Test Agent',
      type: 'network' as const,
      position: { x: 0, y: 0 },
      status: 'idle' as const
    }
  ],
  connections: [
    {
      id: 'conn-1',
      fromNodeId: 'agent-1',
      toNodeId: 'agent-2',
      status: 'idle' as const
    }
  ],
  investigationFlow: {
    nodes: [
      {
        id: 'node-1',
        name: 'Test Node',
        type: 'start' as const,
        position: { x: 0, y: 0 },
        status: 'idle' as const
      }
    ],
    edges: [
      {
        id: 'edge-1',
        fromNodeId: 'node-1',
        toNodeId: 'node-2',
        status: 'idle' as const
      }
    ],
    progress: 0,
    currentPhase: 'initialization'
  },
  logs: [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      type: 'info' as const,
      message: 'Test log message',
      agent: 'TEST'
    }
  ]
};

describe('Simple WebSocket Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders main components correctly', () => {
    render(<CombinedAutonomousInvestigationDisplay {...mockProps} />);
    
    // Check main components are rendered
    expect(screen.getByText('Autonomous Investigation Command Center')).toBeInTheDocument();
    expect(screen.getByTestId('neural-network')).toBeInTheDocument();
    expect(screen.getByTestId('interactive-graph')).toBeInTheDocument();
    expect(screen.getByTestId('command-terminal')).toBeInTheDocument();
  });

  test('displays investigation status correctly', () => {
    render(<CombinedAutonomousInvestigationDisplay {...mockProps} />);
    
    // Should show standby when not active
    expect(screen.getByText('Standby')).toBeInTheDocument();
    expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
  });

  test('displays active status when investigation is active', () => {
    const activeProps = { ...mockProps, isActive: true };
    render(<CombinedAutonomousInvestigationDisplay {...activeProps} />);
    
    // Should show connecting/active status
    expect(screen.getByText(/Connecting|Active/)).toBeInTheDocument();
  });

  test('displays investigation ID when provided', () => {
    render(<CombinedAutonomousInvestigationDisplay {...mockProps} />);
    
    expect(screen.getByText('Investigation ID: test-investigation-123')).toBeInTheDocument();
  });

  test('displays animation speed controls', () => {
    render(<CombinedAutonomousInvestigationDisplay {...mockProps} />);
    
    expect(screen.getByText('Animation Speed:')).toBeInTheDocument();
    expect(screen.getByText('Slow')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Fast')).toBeInTheDocument();
  });

  test('displays correct component titles and descriptions', () => {
    render(<CombinedAutonomousInvestigationDisplay {...mockProps} />);
    
    expect(screen.getByText('Neural Network Flow')).toBeInTheDocument();
    expect(screen.getByText('AI agent coordination with real-time data flow')).toBeInTheDocument();
    
    expect(screen.getByText('Interactive Graph')).toBeInTheDocument();
    expect(screen.getByText('3D investigation flow with WebSocket updates')).toBeInTheDocument();
    
    expect(screen.getByText('Command Terminal')).toBeInTheDocument();
    expect(screen.getByText('Live investigation logs with typewriter effect')).toBeInTheDocument();
  });

  test('component unmounts without errors', () => {
    const { unmount } = render(<CombinedAutonomousInvestigationDisplay {...mockProps} />);
    
    expect(() => unmount()).not.toThrow();
  });
});
