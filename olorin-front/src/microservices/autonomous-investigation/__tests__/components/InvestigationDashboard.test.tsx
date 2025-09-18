import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { InvestigationDashboard } from '../../components/InvestigationDashboard';
import { Investigation, InvestigationStatus } from '../../types/investigation';

// Mock components
jest.mock('../../components/LiveMetricsDisplay', () => {
  return {
    LiveMetricsDisplay: ({ investigations }: { investigations: Investigation[] }) => (
      <div data-testid="live-metrics-display">
        Live Metrics: {investigations.length} investigations
      </div>
    )
  };
});

jest.mock('../../components/AlertCenter', () => {
  return {
    AlertCenter: ({ investigations }: { investigations: Investigation[] }) => (
      <div data-testid="alert-center">
        Alert Center: {investigations.length} investigations
      </div>
    )
  };
});

// Mock data
const mockInvestigations: Investigation[] = [
  {
    id: 'inv-1',
    title: 'Test Investigation 1',
    description: 'Description for test investigation 1',
    status: 'running' as InvestigationStatus,
    priority: 'high',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
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
    }
  },
  {
    id: 'inv-2',
    title: 'Test Investigation 2',
    description: 'Description for test investigation 2',
    status: 'completed' as InvestigationStatus,
    priority: 'medium',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    createdBy: 'test-user',
    assignedAgents: ['agent-3'],
    configuration: {
      parameters: {
        parallelAgents: false,
        timeRange: '12h',
        threshold: 0.6
      }
    },
    progress: {
      overall: 100,
      agents: [
        {
          agentId: 'agent-3',
          status: 'completed',
          progress: 100,
          message: 'Investigation completed successfully'
        }
      ]
    },
    results: {
      riskScore: 0.85,
      confidence: 0.92,
      summary: 'High risk investigation with strong evidence',
      findings: ['Finding 1', 'Finding 2'],
      recommendations: ['Recommendation 1', 'Recommendation 2']
    }
  }
];

const defaultProps = {
  investigations: mockInvestigations,
  isLoading: false,
  onRefresh: jest.fn(),
  onCreateInvestigation: jest.fn(),
  onViewInvestigation: jest.fn()
};

describe('InvestigationDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the dashboard with correct title and description', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByText('Autonomous Investigations')).toBeInTheDocument();
      expect(screen.getByText('AI-powered fraud detection and analysis')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new investigation/i })).toBeInTheDocument();
    });

    it('renders status cards with correct counts', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      // Check status cards
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();

      // Check counts
      expect(screen.getByText('1')).toBeInTheDocument(); // running count
      expect(screen.getByText('1')).toBeInTheDocument(); // completed count
    });

    it('renders quick stats section', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByText('Quick Stats')).toBeInTheDocument();
      expect(screen.getByText('Total Investigations')).toBeInTheDocument();
      expect(screen.getByText('Active Investigations')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
    });

    it('renders recent investigations section', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByText('Recent Investigations')).toBeInTheDocument();
      expect(screen.getByText('Test Investigation 1')).toBeInTheDocument();
      expect(screen.getByText('Test Investigation 2')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<InvestigationDashboard {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Loading investigations...')).toBeInTheDocument();
    });

    it('disables refresh button when loading', () => {
      render(<InvestigationDashboard {...defaultProps} isLoading={true} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no investigations exist', () => {
      render(<InvestigationDashboard {...defaultProps} investigations={[]} />);

      expect(screen.getByText('No investigations yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first autonomous investigation to get started.')).toBeInTheDocument();
    });

    it('shows create investigation button in empty state', () => {
      render(<InvestigationDashboard {...defaultProps} investigations={[]} />);

      const createButtons = screen.getAllByRole('button', { name: /create investigation/i });
      expect(createButtons).toHaveLength(1);
    });
  });

  describe('User Interactions', () => {
    it('calls onRefresh when refresh button is clicked', async () => {
      render(<InvestigationDashboard {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
    });

    it('calls onCreateInvestigation when new investigation button is clicked', async () => {
      render(<InvestigationDashboard {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: /new investigation/i });
      fireEvent.click(createButton);

      expect(defaultProps.onCreateInvestigation).toHaveBeenCalledTimes(1);
    });

    it('calls onViewInvestigation when investigation card is clicked', async () => {
      render(<InvestigationDashboard {...defaultProps} />);

      const investigationCard = screen.getByText('Test Investigation 1').closest('div');
      if (investigationCard) {
        fireEvent.click(investigationCard);
        expect(defaultProps.onViewInvestigation).toHaveBeenCalledWith('inv-1');
      }
    });

    it('calls onViewInvestigation with "list" when view all is clicked', async () => {
      render(<InvestigationDashboard {...defaultProps} />);

      const viewAllLink = screen.getByText('View all →');
      fireEvent.click(viewAllLink);

      expect(defaultProps.onViewInvestigation).toHaveBeenCalledWith('list');
    });
  });

  describe('Status Calculations', () => {
    it('calculates status counts correctly', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      // Total investigations
      expect(screen.getByText('2')).toBeInTheDocument();

      // Active investigations (running + pending)
      expect(screen.getByText('1')).toBeInTheDocument();

      // Success rate (completed / total * 100)
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('handles zero investigations gracefully', () => {
      render(<InvestigationDashboard {...defaultProps} investigations={[]} />);

      expect(screen.getByText('0')).toBeInTheDocument(); // Total
      expect(screen.getByText('0%')).toBeInTheDocument(); // Success rate
    });
  });

  describe('Investigation Card Details', () => {
    it('displays investigation priorities correctly', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('displays investigation statuses correctly', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('shows progress bar for running investigations', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      const progressSection = screen.getByText('75%');
      expect(progressSection).toBeInTheDocument();
    });

    it('displays agent counts correctly', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByText('2 agents')).toBeInTheDocument();
      expect(screen.getByText('1 agents')).toBeInTheDocument();
    });
  });

  describe('Live Components Integration', () => {
    it('renders LiveMetricsDisplay with investigations prop', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByTestId('live-metrics-display')).toBeInTheDocument();
      expect(screen.getByText('Live Metrics: 2 investigations')).toBeInTheDocument();
    });

    it('renders AlertCenter with investigations prop', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      expect(screen.getByTestId('alert-center')).toBeInTheDocument();
      expect(screen.getByText('Alert Center: 2 investigations')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const createButton = screen.getByRole('button', { name: /new investigation/i });

      expect(refreshButton).toBeInTheDocument();
      expect(createButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<InvestigationDashboard {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      refreshButton.focus();

      expect(document.activeElement).toBe(refreshButton);
    });
  });

  describe('Date Formatting', () => {
    it('formats relative dates correctly', () => {
      // Mock Date to ensure consistent results
      const mockDate = new Date('2024-01-01T00:05:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<InvestigationDashboard {...defaultProps} />);

      // Should show "5m ago" for the first investigation
      expect(screen.getByText('5m ago')).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });
});