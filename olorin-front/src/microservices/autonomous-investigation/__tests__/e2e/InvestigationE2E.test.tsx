import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

// Import components
import { InvestigationDashboard } from '../../components/InvestigationDashboard';
import { InvestigationDetails } from '../../components/InvestigationDetails';
import { Investigation } from '../../types/investigation';
import {
  createMockInvestigation,
  createRunningInvestigation,
  createCompletedInvestigation,
  createMockHandlers
} from '../utils/testUtils';

// Mock all subcomponents for E2E testing
jest.mock('../../components/LiveMetricsDisplay', () => ({
  LiveMetricsDisplay: ({ investigations }: { investigations: Investigation[] }) => (
    <div data-testid="live-metrics-display">
      <div data-testid="metrics-count">{investigations.length}</div>
      <div data-testid="active-count">
        {investigations.filter(inv => inv.status === 'running').length}
      </div>
    </div>
  )
}));

jest.mock('../../components/AlertCenter', () => ({
  AlertCenter: ({ investigations }: { investigations: Investigation[] }) => (
    <div data-testid="alert-center">
      <div data-testid="alert-count">
        {investigations.filter(inv => inv.status === 'failed').length}
      </div>
    </div>
  )
}));

jest.mock('../../components/ProgressMonitor', () => ({
  ProgressMonitor: ({ investigation }: { investigation: Investigation }) => (
    <div data-testid="progress-monitor">
      <div data-testid="monitor-investigation-id">{investigation.id}</div>
      <div data-testid="monitor-overall-progress">{investigation.progress.overall}%</div>
      <div data-testid="monitor-agent-count">{investigation.progress.agents.length}</div>
    </div>
  )
}));

jest.mock('../../components/ResultsVisualization', () => ({
  ResultsVisualization: ({ investigation }: { investigation: Investigation }) => (
    <div data-testid="results-visualization">
      <div data-testid="results-investigation-id">{investigation.id}</div>
      {investigation.results && (
        <>
          <div data-testid="results-risk-score">{investigation.results.riskScore}</div>
          <div data-testid="results-findings-count">{investigation.results.findings.length}</div>
        </>
      )}
    </div>
  )
}));

jest.mock('../../components/ExportReporting', () => ({
  ExportReporting: ({ investigation }: { investigation: Investigation }) => (
    <div data-testid="export-reporting">
      <div data-testid="export-investigation-id">{investigation.id}</div>
      <button data-testid="export-pdf-button">Export PDF</button>
      <button data-testid="export-json-button">Export JSON</button>
    </div>
  )
}));

jest.mock('../../hooks/useInvestigationWorkflow', () => ({
  useInvestigationWorkflow: () => ({
    getInvestigationEvents: jest.fn(() => [
      {
        id: 'event-1',
        description: 'Investigation started',
        timestamp: '2024-01-01T00:00:00Z',
        actor: 'System',
        type: 'start'
      },
      {
        id: 'event-2',
        description: 'Agent completed analysis',
        timestamp: '2024-01-01T01:00:00Z',
        actor: 'agent-1',
        type: 'completion'
      }
    ])
  })
}));

jest.mock('../../hooks/useExportReporting', () => ({
  useExportReporting: () => ({
    exportInvestigation: jest.fn()
  })
}));

// Test Application Component
interface TestAppProps {
  initialInvestigations: Investigation[];
  handlers: ReturnType<typeof createMockHandlers>;
}

const TestApp: React.FC<TestAppProps> = ({ initialInvestigations, handlers }) => {
  const [investigations, setInvestigations] = React.useState(initialInvestigations);
  const [currentView, setCurrentView] = React.useState<'dashboard' | 'details'>('dashboard');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleViewInvestigation = (id: string) => {
    if (id === 'list') {
      setCurrentView('dashboard');
    } else {
      setCurrentView('details');
    }
    handlers.onViewInvestigation(id);
  };

  const handleStartInvestigation = async (id: string) => {
    setIsLoading(true);
    await handlers.onStartInvestigation(id);

    // Simulate investigation state change
    setInvestigations(prev => prev.map(inv =>
      inv.id === id
        ? { ...inv, status: 'running', progress: { overall: 10, agents: [{ agentId: 'agent-1', status: 'running', progress: 10, message: 'Starting...' }] }}
        : inv
    ));
    setIsLoading(false);
  };

  const handlePauseInvestigation = async (id: string) => {
    setIsLoading(true);
    await handlers.onPauseInvestigation(id);

    setInvestigations(prev => prev.map(inv =>
      inv.id === id ? { ...inv, status: 'paused' } : inv
    ));
    setIsLoading(false);
  };

  const handleResumeInvestigation = async (id: string) => {
    setIsLoading(true);
    await handlers.onResumeInvestigation(id);

    setInvestigations(prev => prev.map(inv =>
      inv.id === id ? { ...inv, status: 'running' } : inv
    ));
    setIsLoading(false);
  };

  const handleStopInvestigation = async (id: string) => {
    setIsLoading(true);
    await handlers.onStopInvestigation(id);

    setInvestigations(prev => prev.map(inv =>
      inv.id === id ? { ...inv, status: 'stopped' } : inv
    ));
    setIsLoading(false);
  };

  const handleDeleteInvestigation = async (id: string) => {
    setIsLoading(true);
    await handlers.onDeleteInvestigation(id);

    setInvestigations(prev => prev.filter(inv => inv.id !== id));
    setCurrentView('dashboard');
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await handlers.onRefresh();
    setIsLoading(false);
  };

  const handleBack = () => {
    setCurrentView('dashboard');
    handlers.onBack();
  };

  return (
    <MemoryRouter>
      {currentView === 'dashboard' ? (
        <InvestigationDashboard
          investigations={investigations}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onCreateInvestigation={handlers.onCreateInvestigation}
          onViewInvestigation={handleViewInvestigation}
        />
      ) : (
        <InvestigationDetails
          investigations={investigations}
          onStartInvestigation={handleStartInvestigation}
          onPauseInvestigation={handlePauseInvestigation}
          onResumeInvestigation={handleResumeInvestigation}
          onStopInvestigation={handleStopInvestigation}
          onDeleteInvestigation={handleDeleteInvestigation}
          onBack={handleBack}
        />
      )}
    </MemoryRouter>
  );
};

describe('Investigation E2E Flow', () => {
  let mockHandlers: ReturnType<typeof createMockHandlers>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockHandlers = createMockHandlers();
    user = userEvent.setup();
  });

  describe('Complete Investigation Lifecycle', () => {
    it('handles complete investigation workflow from creation to completion', async () => {
      const initialInvestigations = [
        createMockInvestigation({ id: 'inv-1', title: 'Pending Investigation' })
      ];

      render(
        <TestApp
          initialInvestigations={initialInvestigations}
          handlers={mockHandlers}
        />
      );

      // 1. Verify dashboard displays investigation
      expect(screen.getByText('Pending Investigation')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();

      // 2. Navigate to investigation details
      await user.click(screen.getByText('Pending Investigation'));

      expect(mockHandlers.onViewInvestigation).toHaveBeenCalledWith('inv-1');

      // 3. Verify details view loads
      expect(screen.getByText('Pending Investigation')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();

      // 4. Start investigation
      await user.click(screen.getByRole('button', { name: /start/i }));

      expect(mockHandlers.onStartInvestigation).toHaveBeenCalledWith('inv-1');

      // 5. Verify investigation is now running
      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();

      // 6. Pause investigation
      await user.click(screen.getByRole('button', { name: /pause/i }));

      expect(mockHandlers.onPauseInvestigation).toHaveBeenCalledWith('inv-1');

      // 7. Verify investigation is paused
      await waitFor(() => {
        expect(screen.getByText('PAUSED')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

      // 8. Resume investigation
      await user.click(screen.getByRole('button', { name: /resume/i }));

      expect(mockHandlers.onResumeInvestigation).toHaveBeenCalledWith('inv-1');

      // 9. Verify investigation is running again
      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
      });

      // 10. Stop investigation
      await user.click(screen.getByRole('button', { name: /stop/i }));

      expect(mockHandlers.onStopInvestigation).toHaveBeenCalledWith('inv-1');

      // 11. Verify investigation is stopped
      await waitFor(() => {
        expect(screen.getByText('STOPPED')).toBeInTheDocument();
      });
    });

    it('handles investigation deletion workflow', async () => {
      const initialInvestigations = [
        createMockInvestigation({ id: 'inv-1', title: 'Test Investigation', status: 'completed' })
      ];

      render(
        <TestApp
          initialInvestigations={initialInvestigations}
          handlers={mockHandlers}
        />
      );

      // Navigate to details
      await user.click(screen.getByText('Test Investigation'));

      // Delete investigation
      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(mockHandlers.onDeleteInvestigation).toHaveBeenCalledWith('inv-1');

      // Should return to dashboard
      await waitFor(() => {
        expect(screen.getByText('No investigations yet')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation and Content', () => {
    it('navigates through all tabs and displays correct content', async () => {
      const completedInvestigation = createCompletedInvestigation();

      render(
        <TestApp
          initialInvestigations={[completedInvestigation]}
          handlers={mockHandlers}
        />
      );

      // Navigate to details
      await user.click(screen.getByText(completedInvestigation.title));

      // Test Overview tab (default)
      expect(screen.getByText('Investigation Details')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();

      // Test Progress tab
      await user.click(screen.getByRole('button', { name: /progress/i }));
      expect(screen.getByTestId('progress-monitor')).toBeInTheDocument();
      expect(screen.getByTestId('monitor-investigation-id')).toHaveTextContent(completedInvestigation.id);

      // Test Agents tab
      await user.click(screen.getByRole('button', { name: /agents/i }));
      expect(screen.getByText('Agent Progress')).toBeInTheDocument();

      // Test Timeline tab
      await user.click(screen.getByRole('button', { name: /timeline/i }));
      expect(screen.getByText('Investigation Timeline')).toBeInTheDocument();
      expect(screen.getByText('Investigation started')).toBeInTheDocument();

      // Test Results tab
      await user.click(screen.getByRole('button', { name: /results/i }));
      expect(screen.getByTestId('results-visualization')).toBeInTheDocument();
      expect(screen.getByTestId('results-risk-score')).toHaveTextContent('0.75');

      // Test Export tab
      await user.click(screen.getByRole('button', { name: /export/i }));
      expect(screen.getByTestId('export-reporting')).toBeInTheDocument();
      expect(screen.getByTestId('export-pdf-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-json-button')).toBeInTheDocument();
    });
  });

  describe('Dashboard Statistics and Filtering', () => {
    it('displays correct statistics and metrics', async () => {
      const investigations = [
        createMockInvestigation({ status: 'pending' }),
        createRunningInvestigation(),
        createCompletedInvestigation(),
        createMockInvestigation({ status: 'failed' })
      ];

      render(
        <TestApp
          initialInvestigations={investigations}
          handlers={mockHandlers}
        />
      );

      // Check total count
      expect(screen.getByText('4')).toBeInTheDocument(); // Total investigations

      // Check individual status counts
      expect(screen.getAllByText('1')).toHaveLength(4); // Each status has 1 investigation

      // Check success rate (1 completed out of 4 total = 25%)
      expect(screen.getByText('25%')).toBeInTheDocument();

      // Check live metrics display
      expect(screen.getByTestId('metrics-count')).toHaveTextContent('4');
      expect(screen.getByTestId('active-count')).toHaveTextContent('1'); // One running

      // Check alert center
      expect(screen.getByTestId('alert-count')).toHaveTextContent('1'); // One failed
    });

    it('handles refresh functionality', async () => {
      render(
        <TestApp
          initialInvestigations={[]}
          handlers={mockHandlers}
        />
      );

      await user.click(screen.getByRole('button', { name: /refresh/i }));

      expect(mockHandlers.onRefresh).toHaveBeenCalled();
    });

    it('handles create investigation action', async () => {
      render(
        <TestApp
          initialInvestigations={[]}
          handlers={mockHandlers}
        />
      );

      await user.click(screen.getByRole('button', { name: /new investigation/i }));

      expect(mockHandlers.onCreateInvestigation).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates Simulation', () => {
    it('updates progress indicators in real-time', async () => {
      const runningInvestigation = createRunningInvestigation(25);

      const { rerender } = render(
        <TestApp
          initialInvestigations={[runningInvestigation]}
          handlers={mockHandlers}
        />
      );

      // Navigate to details
      await user.click(screen.getByText(runningInvestigation.title));

      // Check initial progress
      expect(screen.getByText('25%')).toBeInTheDocument();

      // Navigate to progress tab
      await user.click(screen.getByRole('button', { name: /progress/i }));
      expect(screen.getByTestId('monitor-overall-progress')).toHaveTextContent('25%');

      // Simulate progress update
      const updatedInvestigation = {
        ...runningInvestigation,
        progress: {
          ...runningInvestigation.progress,
          overall: 75
        }
      };

      rerender(
        <TestApp
          initialInvestigations={[updatedInvestigation]}
          handlers={mockHandlers}
        />
      );

      // Check updated progress
      expect(screen.getByTestId('monitor-overall-progress')).toHaveTextContent('75%');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles investigation not found gracefully', async () => {
      render(
        <TestApp
          initialInvestigations={[]}
          handlers={mockHandlers}
        />
      );

      // Manually set current view to details with invalid ID
      const TestAppWithInvalidId: React.FC = () => (
        <MemoryRouter>
          <InvestigationDetails
            investigations={[]}
            onStartInvestigation={mockHandlers.onStartInvestigation}
            onPauseInvestigation={mockHandlers.onPauseInvestigation}
            onResumeInvestigation={mockHandlers.onResumeInvestigation}
            onStopInvestigation={mockHandlers.onStopInvestigation}
            onDeleteInvestigation={mockHandlers.onDeleteInvestigation}
            onBack={mockHandlers.onBack}
          />
        </MemoryRouter>
      );

      render(<TestAppWithInvalidId />);

      expect(screen.getByText('Investigation Not Found')).toBeInTheDocument();

      // Test back button
      await user.click(screen.getByRole('button', { name: /back to dashboard/i }));
      expect(mockHandlers.onBack).toHaveBeenCalled();
    });

    it('handles empty dashboard state', () => {
      render(
        <TestApp
          initialInvestigations={[]}
          handlers={mockHandlers}
        />
      );

      expect(screen.getByText('No investigations yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first autonomous investigation to get started.')).toBeInTheDocument();
    });

    it('handles loading states during actions', async () => {
      const investigation = createMockInvestigation();

      // Mock slow operation
      mockHandlers.onStartInvestigation.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TestApp
          initialInvestigations={[investigation]}
          handlers={mockHandlers}
        />
      );

      // Navigate to details
      await user.click(screen.getByText(investigation.title));

      // Start investigation (which will be slow)
      await user.click(screen.getByRole('button', { name: /start/i }));

      // Button should be disabled during operation
      expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Navigation Flow', () => {
    it('handles back navigation from details to dashboard', async () => {
      const investigation = createMockInvestigation();

      render(
        <TestApp
          initialInvestigations={[investigation]}
          handlers={mockHandlers}
        />
      );

      // Navigate to details
      await user.click(screen.getByText(investigation.title));

      // Verify we're in details view
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();

      // Navigate back
      await user.click(screen.getByRole('button', { name: /back/i }));

      // Should be back on dashboard
      expect(screen.getByText('Autonomous Investigations')).toBeInTheDocument();
      expect(mockHandlers.onBack).toHaveBeenCalled();
    });

    it('handles view all investigations link', async () => {
      const investigations = [
        createMockInvestigation({ title: 'Investigation 1' }),
        createMockInvestigation({ title: 'Investigation 2' })
      ];

      render(
        <TestApp
          initialInvestigations={investigations}
          handlers={mockHandlers}
        />
      );

      // Click view all link
      await user.click(screen.getByText('View all →'));

      expect(mockHandlers.onViewInvestigation).toHaveBeenCalledWith('list');
    });
  });
});