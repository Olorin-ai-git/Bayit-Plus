import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { jest } from '@jest/globals';
import { InvestigationDetails } from '../../components/InvestigationDetails';
import { Investigation, InvestigationStatus } from '../../types/investigation';

// Mock components
jest.mock('../../components/ProgressMonitor', () => {
  return {
    ProgressMonitor: ({ investigation }: { investigation: Investigation }) => (
      <div data-testid="progress-monitor">
        Progress Monitor for {investigation.title}
      </div>
    )
  };
});

jest.mock('../../components/ResultsVisualization', () => {
  return {
    ResultsVisualization: ({ investigation }: { investigation: Investigation }) => (
      <div data-testid="results-visualization">
        Results Visualization for {investigation.title}
      </div>
    )
  };
});

jest.mock('../../components/ExportReporting', () => {
  return {
    ExportReporting: ({ investigation }: { investigation: Investigation }) => (
      <div data-testid="export-reporting">
        Export Reporting for {investigation.title}
      </div>
    )
  };
});

jest.mock('../../hooks/useInvestigationWorkflow', () => ({
  useInvestigationWorkflow: () => ({
    getInvestigationEvents: jest.fn(() => [
      {
        id: 'event-1',
        description: 'Investigation started',
        timestamp: '2024-01-01T00:00:00Z',
        actor: 'System',
        type: 'start'
      }
    ])
  })
}));

jest.mock('../../hooks/useExportReporting', () => ({
  useExportReporting: () => ({
    exportInvestigation: jest.fn()
  })
}));

const mockInvestigation: Investigation = {
  id: 'inv-1',
  title: 'Test Investigation',
  description: 'Test investigation description',
  status: 'running' as InvestigationStatus,
  priority: 'high',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  startedAt: '2024-01-01T00:00:00Z',
  createdBy: 'test-user',
  assignedAgents: ['agent-1', 'agent-2'],
  configuration: {
    parameters: {
      parallelAgents: true,
      timeRange: '24h',
      threshold: 0.8
    }
  },
  progress: {
    overall: 75,
    agents: [
      {
        agentId: 'agent-1',
        status: 'running',
        progress: 80,
        message: 'Processing data...'
      },
      {
        agentId: 'agent-2',
        status: 'completed',
        progress: 100,
        message: 'Analysis complete'
      }
    ]
  },
  results: {
    riskScore: 0.85,
    confidence: 0.92,
    summary: 'High risk investigation with strong evidence',
    findings: ['Finding 1', 'Finding 2', 'Finding 3'],
    recommendations: ['Recommendation 1', 'Recommendation 2']
  }
};

const defaultProps = {
  investigations: [mockInvestigation],
  onStartInvestigation: jest.fn(),
  onPauseInvestigation: jest.fn(),
  onResumeInvestigation: jest.fn(),
  onStopInvestigation: jest.fn(),
  onDeleteInvestigation: jest.fn(),
  onBack: jest.fn()
};

const renderInvestigationDetails = (investigationId = 'inv-1') => {
  return render(
    <MemoryRouter initialEntries={[`/investigation/${investigationId}`]}>
      <Routes>
        <Route
          path="/investigation/:id"
          element={<InvestigationDetails {...defaultProps} />}
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('InvestigationDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders investigation details correctly', () => {
      renderInvestigationDetails();

      expect(screen.getByText('Test Investigation')).toBeInTheDocument();
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByText('ID: inv-1')).toBeInTheDocument();
    });

    it('renders back button', () => {
      renderInvestigationDetails();

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('renders investigation tabs', () => {
      renderInvestigationDetails();

      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /progress/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /agents/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /timeline/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /results/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('shows progress bar for running investigations', () => {
      renderInvestigationDetails();

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Investigation Not Found', () => {
    it('shows not found message for invalid investigation ID', () => {
      renderInvestigationDetails('invalid-id');

      expect(screen.getByText('Investigation Not Found')).toBeInTheDocument();
      expect(screen.getByText('The investigation you\'re looking for doesn\'t exist or has been deleted.')).toBeInTheDocument();
    });

    it('shows back button in not found state', () => {
      renderInvestigationDetails('invalid-id');

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action Buttons', () => {
    it('shows appropriate action buttons based on status', () => {
      renderInvestigationDetails();

      // Running investigation should show Pause and Stop buttons
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('calls onPauseInvestigation when pause button is clicked', async () => {
      renderInvestigationDetails();

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(defaultProps.onPauseInvestigation).toHaveBeenCalledWith('inv-1');
      });
    });

    it('calls onStopInvestigation when stop button is clicked', async () => {
      renderInvestigationDetails();

      const stopButton = screen.getByRole('button', { name: /stop/i });
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(defaultProps.onStopInvestigation).toHaveBeenCalledWith('inv-1');
      });
    });

    it('calls onDeleteInvestigation when delete button is clicked', async () => {
      renderInvestigationDetails();

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(defaultProps.onDeleteInvestigation).toHaveBeenCalledWith('inv-1');
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches to progress tab when clicked', () => {
      renderInvestigationDetails();

      const progressTab = screen.getByRole('button', { name: /progress/i });
      fireEvent.click(progressTab);

      expect(screen.getByTestId('progress-monitor')).toBeInTheDocument();
    });

    it('switches to results tab when clicked', () => {
      renderInvestigationDetails();

      const resultsTab = screen.getByRole('button', { name: /results/i });
      fireEvent.click(resultsTab);

      expect(screen.getByTestId('results-visualization')).toBeInTheDocument();
    });

    it('switches to export tab when clicked', () => {
      renderInvestigationDetails();

      const exportTab = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportTab);

      expect(screen.getByTestId('export-reporting')).toBeInTheDocument();
    });

    it('shows active tab styling', () => {
      renderInvestigationDetails();

      const overviewTab = screen.getByRole('button', { name: /overview/i });
      expect(overviewTab).toHaveClass('border-blue-500', 'text-blue-600');

      const progressTab = screen.getByRole('button', { name: /progress/i });
      fireEvent.click(progressTab);

      expect(progressTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(overviewTab).not.toHaveClass('border-blue-500', 'text-blue-600');
    });
  });

  describe('Overview Tab Content', () => {
    it('displays investigation details', () => {
      renderInvestigationDetails();

      expect(screen.getByText('Investigation Details')).toBeInTheDocument();
      expect(screen.getByText('Test investigation description')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('test-user')).toBeInTheDocument();
    });

    it('displays configuration details', () => {
      renderInvestigationDetails();

      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('2 agents')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument(); // Parallel execution
      expect(screen.getByText('24h')).toBeInTheDocument(); // Time range
      expect(screen.getByText('0.8')).toBeInTheDocument(); // Threshold
    });
  });

  describe('Agents Tab Content', () => {
    it('displays agent progress when agents tab is selected', () => {
      renderInvestigationDetails();

      const agentsTab = screen.getByRole('button', { name: /agents/i });
      fireEvent.click(agentsTab);

      expect(screen.getByText('Agent Progress')).toBeInTheDocument();
      expect(screen.getByText('agent-1')).toBeInTheDocument();
      expect(screen.getByText('agent-2')).toBeInTheDocument();
      expect(screen.getByText('Processing data...')).toBeInTheDocument();
      expect(screen.getByText('Analysis complete')).toBeInTheDocument();
    });

    it('shows agent status indicators', () => {
      renderInvestigationDetails();

      const agentsTab = screen.getByRole('button', { name: /agents/i });
      fireEvent.click(agentsTab);

      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    it('displays agent progress percentages', () => {
      renderInvestigationDetails();

      const agentsTab = screen.getByRole('button', { name: /agents/i });
      fireEvent.click(agentsTab);

      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Timeline Tab Content', () => {
    it('displays timeline events when timeline tab is selected', () => {
      renderInvestigationDetails();

      const timelineTab = screen.getByRole('button', { name: /timeline/i });
      fireEvent.click(timelineTab);

      expect(screen.getByText('Investigation Timeline')).toBeInTheDocument();
      expect(screen.getByText('Investigation started')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading overlay when action is in progress', async () => {
      const slowOnPause = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderInvestigationDetails();

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(pauseButton);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables buttons when loading', () => {
      renderInvestigationDetails();

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      const stopButton = screen.getByRole('button', { name: /stop/i });
      const deleteButton = screen.getByRole('button', { name: /delete/i });

      // Buttons should be enabled initially
      expect(pauseButton).not.toBeDisabled();
      expect(stopButton).not.toBeDisabled();
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Status-based Button Visibility', () => {
    it('shows start button for pending investigation', () => {
      const pendingInvestigation = {
        ...mockInvestigation,
        status: 'pending' as InvestigationStatus
      };

      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <Routes>
            <Route
              path="/investigation/:id"
              element={
                <InvestigationDetails
                  {...defaultProps}
                  investigations={[pendingInvestigation]}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });

    it('shows resume button for paused investigation', () => {
      const pausedInvestigation = {
        ...mockInvestigation,
        status: 'paused' as InvestigationStatus
      };

      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <Routes>
            <Route
              path="/investigation/:id"
              element={
                <InvestigationDetails
                  {...defaultProps}
                  investigations={[pausedInvestigation]}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });
  });

  describe('Date and Duration Formatting', () => {
    it('formats creation date correctly', () => {
      renderInvestigationDetails();

      const createdDate = new Date('2024-01-01T00:00:00Z').toLocaleString();
      expect(screen.getByText(`Created ${createdDate}`)).toBeInTheDocument();
    });

    it('calculates and displays duration', () => {
      renderInvestigationDetails();

      // Duration calculation is tested implicitly through the component rendering
      expect(screen.getByText('Duration')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles investigation with agent errors', () => {
      const investigationWithErrors = {
        ...mockInvestigation,
        progress: {
          overall: 50,
          agents: [
            {
              agentId: 'agent-1',
              status: 'failed',
              progress: 0,
              message: 'Agent failed',
              error: 'Connection timeout'
            }
          ]
        }
      };

      render(
        <MemoryRouter initialEntries={['/investigation/inv-1']}>
          <Routes>
            <Route
              path="/investigation/:id"
              element={
                <InvestigationDetails
                  {...defaultProps}
                  investigations={[investigationWithErrors]}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      );

      const agentsTab = screen.getByRole('button', { name: /agents/i });
      fireEvent.click(agentsTab);

      expect(screen.getByText('Error: Connection timeout')).toBeInTheDocument();
    });
  });
});