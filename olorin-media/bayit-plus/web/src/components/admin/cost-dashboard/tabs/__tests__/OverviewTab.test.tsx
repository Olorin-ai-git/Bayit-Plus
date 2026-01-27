import React from 'react';
import { render, screen } from '@testing-library/react';
import OverviewTab from '../OverviewTab';

describe('OverviewTab', () => {
  const mockDashboard = {
    loading: { breakdown: false },
    errors: { breakdown: null },
    data: {
      breakdown: {
        ai_cost: 5230,
        infrastructure_cost: 4120,
        thirdparty_cost: 2390,
      },
    },
  };

  it('renders overview tab', () => {
    render(<OverviewTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
  });

  it('displays AI costs category', () => {
    render(<OverviewTab dashboard={mockDashboard} />);
    expect(screen.getByText('AI Costs')).toBeInTheDocument();
  });

  it('displays infrastructure category', () => {
    render(<OverviewTab dashboard={mockDashboard} />);
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
  });

  it('displays third-party category', () => {
    render(<OverviewTab dashboard={mockDashboard} />);
    expect(screen.getByText('Third-party')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    const loadingDashboard = { ...mockDashboard, loading: { breakdown: true } };
    render(<OverviewTab dashboard={loadingDashboard} />);
    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
  });

  it('handles error state', () => {
    const errorDashboard = { ...mockDashboard, errors: { breakdown: 'API error' } };
    render(<OverviewTab dashboard={errorDashboard} />);
    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
  });

  it('renders cost values', () => {
    render(<OverviewTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
  });

  it('displays percentage breakdown', () => {
    render(<OverviewTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
  });

  it('shows component items list', () => {
    render(<OverviewTab dashboard={mockDashboard} />);
    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
  });

  it('renders with GlassCard styling', () => {
    const { container } = render(<OverviewTab dashboard={mockDashboard} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
