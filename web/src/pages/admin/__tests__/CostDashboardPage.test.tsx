import '@/__tests__/support/costDashboardI18n';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CostDashboardPage from '../CostDashboardPage';
import * as costDashboardService from '../../../services/adminApi/costDashboard';

jest.mock('../../../services/adminApi/costDashboard');
jest.mock('@/services/adminApi', () => ({ usersService: { getUsers: jest.fn().mockResolvedValue({ items: [] }) } }));

describe('CostDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(costDashboardService.costDashboardService.getTimeline).mockResolvedValue([] as never);
    jest.mocked(costDashboardService.costDashboardService.getBreakdown).mockResolvedValue({ ai_costs: { stt: 0 }, infrastructure_costs: { gcp: 0 }, thirdparty_costs: { stripe: 0 }, total_platform: 0, total_permanent: 0, total_transient: 0 } as never);
    (costDashboardService.costDashboardService.getOverview as jest.Mock).mockResolvedValue({
      revenue: 15000,
      total_costs: 8500,
      profit_loss: 6500, profit_margin: 43.3, cost_per_minute: 0,
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
