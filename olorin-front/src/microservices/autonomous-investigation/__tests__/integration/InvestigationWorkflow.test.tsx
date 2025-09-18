import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { jest } from '@jest/globals';
import { InvestigationDashboard } from '../../components/InvestigationDashboard';
import { InvestigationDetails } from '../../components/InvestigationDetails';
import { Investigation, InvestigationStatus } from '../../types/investigation';

// Mock all subcomponents
jest.mock('../../components/LiveMetricsDisplay', () => ({
  LiveMetricsDisplay: () => <div data-testid="live-metrics-display">Live Metrics</div>
}));

jest.mock('../../components/AlertCenter', () => ({
  AlertCenter: () => <div data-testid="alert-center">Alert Center</div>
}));

jest.mock('../../components/ProgressMonitor', () => ({
  ProgressMonitor: () => <div data-testid="progress-monitor">Progress Monitor</div>
}));

jest.mock('../../components/ResultsVisualization', () => ({
  ResultsVisualization: () => <div data-testid="results-visualization">Results Visualization</div>
}));

jest.mock('../../components/ExportReporting', () => ({
  ExportReporting: () => <div data-testid="export-reporting">Export Reporting</div>
}));

jest.mock('../../hooks/useInvestigationWorkflow', () => ({
  useInvestigationWorkflow: () => ({
    getInvestigationEvents: jest.fn(() => [])
  })
}));

jest.mock('../../hooks/useExportReporting', () => ({
  useExportReporting: () => ({
    exportInvestigation: jest.fn()
  })
}));

// Test data
const createMockInvestigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'inv-1',
  title: 'Test Investigation',
  description: 'Test investigation description',
  status: 'pending' as InvestigationStatus,
  priority: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'test-user',
  assignedAgents: ['agent-1'],
  configuration: {
    parameters: {
      parallelAgents: false,
      timeRange: '24h',
      threshold: 0.7
    }
  },
  progress: {
    overall: 0,
    agents: []
  },
  ...overrides
});

describe('Investigation Workflow Integration', () => {
  let mockInvestigations: Investigation[];
  let mockHandlers: {
    onRefresh: jest.Mock;
    onCreateInvestigation: jest.Mock;
    onViewInvestigation: jest.Mock;
    onStartInvestigation: jest.Mock;
    onPauseInvestigation: jest.Mock;
    onResumeInvestigation: jest.Mock;
    onStopInvestigation: jest.Mock;
    onDeleteInvestigation: jest.Mock;
    onBack: jest.Mock;
  };

  beforeEach(() => {
    mockInvestigations = [
      createMockInvestigation(),
      createMockInvestigation({
        id: 'inv-2',
        title: 'Running Investigation',
        status: 'running',
        progress: {
          overall: 45,
          agents: [
            {
              agentId: 'agent-1',
              status: 'running',
              progress: 45,
              message: 'Analyzing data...'
            }
          ]
        }
      }),
      createMockInvestigation({
        id: 'inv-3',
        title: 'Completed Investigation',
        status: 'completed',
        progress: {
          overall: 100,
          agents: [
            {
              agentId: 'agent-1',
              status: 'completed',
              progress: 100,
              message: 'Analysis complete'
            }
          ]
        },
        results: {
          riskScore: 0.8,
          confidence: 0.9,
          summary: 'High risk detected',
          findings: ['Suspicious activity found'],
          recommendations: ['Investigate further']
        }
      })
    ];

    mockHandlers = {
      onRefresh: jest.fn(),
      onCreateInvestigation: jest.fn(),
      onViewInvestigation: jest.fn(),
      onStartInvestigation: jest.fn(),
      onPauseInvestigation: jest.fn(),
      onResumeInvestigation: jest.fn(),
      onStopInvestigation: jest.fn(),
      onDeleteInvestigation: jest.fn(),
      onBack: jest.fn()
    };
  });

  describe('Dashboard to Details Navigation', () => {
    it('navigates from dashboard to investigation details', async () => {
      const { rerender } = render(
        <InvestigationDashboard
          investigations={mockInvestigations}
          isLoading={false}
          {...mockHandlers}
        />
      );

      // Click on an investigation
      fireEvent.click(screen.getByText('Test Investigation'));

      expect(mockHandlers.onViewInvestigation).toHaveBeenCalledWith('inv-1');

      // Simulate navigation to details view
      rerender(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={mockInvestigations}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Test Investigation')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('handles invalid investigation ID gracefully', () => {
      render(
        <MemoryRouter initialEntries={['/investigation/invalid']}>
          <InvestigationDetails
            investigations={mockInvestigations}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Investigation Not Found')).toBeInTheDocument();
    });
  });

  describe('Investigation Lifecycle Management', () => {
    it('handles full investigation lifecycle from pending to completed', async () => {
      // Start with pending investigation
      let currentInvestigation = createMockInvestigation();

      const { rerender } = render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[currentInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      // Should show start button for pending investigation
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();

      // Simulate starting investigation
      fireEvent.click(screen.getByRole('button', { name: /start/i }));
      expect(mockHandlers.onStartInvestigation).toHaveBeenCalledWith('inv-1');

      // Update to running state
      currentInvestigation = {
        ...currentInvestigation,
        status: 'running',
        progress: {
          overall: 25,
          agents: [
            {
              agentId: 'agent-1',
              status: 'running',
              progress: 25,
              message: 'Starting analysis...'
            }
          ]
        }
      };

      rerender(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[currentInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      // Should show pause and stop buttons for running investigation
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();

      // Simulate pausing investigation
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      expect(mockHandlers.onPauseInvestigation).toHaveBeenCalledWith('inv-1');

      // Update to paused state
      currentInvestigation = {
        ...currentInvestigation,
        status: 'paused'
      };

      rerender(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[currentInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      // Should show resume button for paused investigation
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

      // Simulate resuming investigation
      fireEvent.click(screen.getByRole('button', { name: /resume/i }));
      expect(mockHandlers.onResumeInvestigation).toHaveBeenCalledWith('inv-1');

      // Update to completed state
      currentInvestigation = {
        ...currentInvestigation,
        status: 'completed',
        progress: {
          overall: 100,
          agents: [
            {
              agentId: 'agent-1',
              status: 'completed',
              progress: 100,
              message: 'Analysis complete'
            }
          ]
        },
        results: {
          riskScore: 0.75,
          confidence: 0.85,
          summary: 'Investigation completed successfully',
          findings: ['Key finding 1'],
          recommendations: ['Recommendation 1']
        }
      };

      rerender(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[currentInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      // Should show completed status and results
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.queryByText('Overall Progress')).not.toBeInTheDocument();
    });

    it('handles investigation failure scenario', async () => {
      const failedInvestigation = createMockInvestigation({
        status: 'failed',
        progress: {
          overall: 30,
          agents: [
            {
              agentId: 'agent-1',
              status: 'failed',
              progress: 30,
              message: 'Analysis failed',
              error: 'Connection timeout'
            }
          ]
        }
      });

      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[failedInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('FAILED')).toBeInTheDocument();

      // Switch to agents tab to see error details
      fireEvent.click(screen.getByRole('button', { name: /agents/i }));
      expect(screen.getByText('Error: Connection timeout')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation and Content Loading', () => {
    it('loads different tab content correctly', async () => {
      const completedInvestigation = createMockInvestigation({
        status: 'completed',
        results: {
          riskScore: 0.8,
          confidence: 0.9,
          summary: 'Test results',
          findings: ['Finding 1'],
          recommendations: ['Recommendation 1']
        }
      });

      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[completedInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      // Test Overview tab (default)
      expect(screen.getByText('Investigation Details')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();

      // Test Progress tab
      fireEvent.click(screen.getByRole('button', { name: /progress/i }));
      expect(screen.getByTestId('progress-monitor')).toBeInTheDocument();

      // Test Results tab
      fireEvent.click(screen.getByRole('button', { name: /results/i }));
      expect(screen.getByTestId('results-visualization')).toBeInTheDocument();

      // Test Export tab
      fireEvent.click(screen.getByRole('button', { name: /export/i }));
      expect(screen.getByTestId('export-reporting')).toBeInTheDocument();
    });

    it('shows appropriate tab states based on investigation status', () => {
      const pendingInvestigation = createMockInvestigation();

      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[pendingInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      // All tabs should be accessible
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /progress/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /results/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });

  describe('Dashboard State Management', () => {
    it('displays correct statistics and counts', () => {
      render(
        <InvestigationDashboard
          investigations={mockInvestigations}
          isLoading={false}
          {...mockHandlers}
        />
      );

      // Check total investigations
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count

      // Check status distribution
      expect(screen.getAllByText('1')).toHaveLength(4); // Each status has 1 investigation

      // Check success rate
      expect(screen.getByText('33%')).toBeInTheDocument(); // 1 completed out of 3 total
    });

    it('handles empty state correctly', () => {
      render(
        <InvestigationDashboard
          investigations={[]}
          isLoading={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('No investigations yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first autonomous investigation to get started.')).toBeInTheDocument();
    });

    it('handles loading state correctly', () => {
      render(
        <InvestigationDashboard
          investigations={[]}
          isLoading={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Loading investigations...')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles investigation without results gracefully', () => {
      const investigationWithoutResults = createMockInvestigation({
        status: 'completed'
        // No results property
      });

      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[investigationWithoutResults]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      // Should still render without crashing
      expect(screen.getByText('Test Investigation')).toBeInTheDocument();

      // Export tab should handle missing results
      fireEvent.click(screen.getByRole('button', { name: /export/i }));
      expect(screen.getByTestId('export-reporting')).toBeInTheDocument();
    });

    it('handles investigation with missing agent data', () => {
      const investigationWithMissingAgentData = createMockInvestigation({
        status: 'running',
        progress: {
          overall: 50,
          agents: [] // No agent data
        }
      });

      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[investigationWithMissingAgentData]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      // Switch to agents tab
      fireEvent.click(screen.getByRole('button', { name: /agents/i }));

      // Should handle empty agents list gracefully
      expect(screen.getByText('Agent Progress')).toBeInTheDocument();
    });

    it('handles action button loading states', async () => {
      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[createMockInvestigation()]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      const startButton = screen.getByRole('button', { name: /start/i });

      // Mock slow async operation
      mockHandlers.onStartInvestigation.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      fireEvent.click(startButton);

      // Button should be disabled during operation
      expect(startButton).toBeDisabled();
    });
  });

  describe('Real-time Updates Simulation', () => {
    it('updates progress in real-time', async () => {
      let currentInvestigation = createMockInvestigation({
        status: 'running',
        progress: {
          overall: 10,
          agents: [
            {
              agentId: 'agent-1',
              status: 'running',
              progress: 10,
              message: 'Starting...'
            }
          ]
        }
      });

      const { rerender } = render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[currentInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('10%')).toBeInTheDocument();

      // Simulate progress update
      currentInvestigation = {
        ...currentInvestigation,
        progress: {
          overall: 50,
          agents: [
            {
              agentId: 'agent-1',
              status: 'running',
              progress: 50,
              message: 'Processing data...'
            }
          ]
        }
      };

      rerender(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <InvestigationDetails
            investigations={[currentInvestigation]}
            {...mockHandlers}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Processing data...')).toBeInTheDocument();
    });
  });
});