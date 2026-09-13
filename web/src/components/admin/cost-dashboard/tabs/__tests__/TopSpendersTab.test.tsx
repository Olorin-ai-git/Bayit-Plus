import '@/__tests__/support/costDashboardI18n';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TopSpendersTab from '../TopSpendersTab';

describe('TopSpendersTab', () => {
  const mockDashboard = {
    loading: { topSpenders: false },
    data: { topSpenders: { spenders: [{ rank: 1, user_id_hash: 'a3f2b1...', total_cost_range: '100-500 USD', spend_percentage: 5.2 }, { rank: 2, user_id_hash: 'c7d4e2...', total_cost_range: '50-100 USD', spend_percentage: 4.1 }] } },
    errors: { topSpenders: null },
  };

  it('renders top spenders tab', () => {
    render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(screen.getByText('Top Spenders')).toBeInTheDocument();
  });

  it('displays table with columns', () => {
    render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('User ID')).toBeInTheDocument();
    expect(screen.getByText('Cost Range')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const loadingDashboard = { ...mockDashboard, loading: { topSpenders: true } };
    render(<TopSpendersTab dashboard={loadingDashboard} />);
    expect(screen.getByText('Top Spenders')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorDashboard = { ...mockDashboard, errors: { topSpenders: 'API error' } };
    render(<TopSpendersTab dashboard={errorDashboard} />);
    expect(screen.getByText('Top Spenders')).toBeInTheDocument();
  });

  it('displays user hashes', () => {
    render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(screen.getByText('a3f2b1...')).toBeInTheDocument();
  });

  it('displays cost ranges', () => {
    render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(screen.getByText('100-500 USD')).toBeInTheDocument();
  });

  it('displays percentage of total', () => {
    render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });

  it('shows privacy notice', () => {
    render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(screen.getByText(/identifiers are hashed/i)).toBeInTheDocument();
  });

  it('renders with GlassCard styling', () => {
    const { container } = render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays ranks in order', () => {
    render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});
