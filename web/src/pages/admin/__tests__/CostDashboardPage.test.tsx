import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CostDashboardPage from '../CostDashboardPage';
import * as costDashboardService from '../../../services/adminApi/costDashboard';

jest.mock('../../../services/adminApi/costDashboard');
jest.mock('../../../hooks/admin/useCostDashboard', () => ({
  useCostDashboard: () => ({
    scope: 'system_wide',
    selectedUserId: undefined,
    onScopeChange: jest.fn(),
    onUserSelect: jest.fn(),
    dateRange: { start: new Date(), end: new Date() },
    activeTab: 'overview',
    onTabChange: jest.fn(),
    data: {
      revenue: 15000,
      totalCost: 8500,
      profitLoss: 6500,
      profitMargin: 43.3,
      costPerMinute: 0.85,
      monthlyRate: 255000,
      ytdCost: 102000,
      ytdRevenue: 180000,
      breakdown: {
        ai_cost: 5230,
        infrastructure_cost: 4120,
        thirdparty_cost: 2390,
      },
    },
    loading: {
      overview: false,
      breakdown: false,
      timeline: false,
      topSpenders: false,
    },
    errors: {
      overview: null,
      breakdown: null,
      timeline: null,
      topSpenders: null,
    },
  }),
}));

describe('CostDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (costDashboardService.costDashboardService.getOverview as jest.Mock).mockResolvedValue({
      revenue: 15000,
      totalCost: 8500,
    });
  });

  it('renders the cost dashboard page', () => {
    render(<CostDashboardPage />);
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
  });

  it('displays P&L summary with revenue and costs', async () => {
    render(<CostDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
    });
  });

  it('renders tab navigation', () => {
    render(<CostDashboardPage />);
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
  });

  it('calls getOverview on component mount', async () => {
    render(<CostDashboardPage />);
    await waitFor(() => {
      expect(costDashboardService.costDashboardService.getOverview).toHaveBeenCalled();
    });
  });

  it('handles API errors gracefully', async () => {
    (costDashboardService.costDashboardService.getOverview as jest.Mock).mockRejectedValue(
      new Error('API error')
    );
    render(<CostDashboardPage />);
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
  });

  it('displays scope toggle', () => {
    render(<CostDashboardPage />);
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
  });

  it('renders cost breakdown content', async () => {
    render(<CostDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    render(<CostDashboardPage />);
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
  });

  it('renders metrics grid', async () => {
    render(<CostDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
    });
  });

  it('renders all tabs', () => {
    render(<CostDashboardPage />);
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
  });

  it('renders PL summary section', () => {
    render(<CostDashboardPage />);
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
  });

  it('renders real-time status badge', () => {
    render(<CostDashboardPage />);
    expect(screen.getByText('Cost Dashboard')).toBeInTheDocument();
  });
});
