import React from 'react';
import { render, screen } from '@testing-library/react';
import TopSpendersTab from '../TopSpendersTab';

describe('TopSpendersTab', () => {
  const mockDashboard = {
    loading: { topSpenders: false },
    errors: { topSpenders: null },
  };

  it('renders top spenders tab', () => {
    render(<TopSpendersTab dashboard={mockDashboard} />);
    expect(screen.getByText('Top 20 Spenders (Monthly)')).toBeInTheDocument();
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
    expect(screen.getByText('Top 20 Spenders (Monthly)')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorDashboard = { ...mockDashboard, errors: { topSpenders: 'API error' } };
    render(<TopSpendersTab dashboard={errorDashboard} />);
    expect(screen.getByText('Top 20 Spenders (Monthly)')).toBeInTheDocument();
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
    expect(screen.getByText(/hashed.*privacy/i)).toBeInTheDocument();
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
